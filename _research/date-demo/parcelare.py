"""Generator de parcelare demo: grila de loturi aliniata la axa drumului.
Pur numpy (fara shapely) ca sa fie rulabil oriunde; in productie -> shapely/pyproj.
"""
import json, math, sys
import numpy as np
sys.path.insert(0,'.'); from geo import enu, R

def wgs(x, y, lat0, lon0):
    lat = lat0 + np.degrees(y / R)
    lon = lon0 + np.degrees(x / (R * math.cos(math.radians(lat0))))
    return lat, lon

def pip(px, py, vx, vy):
    """even-odd point-in-polygon, vectorizat pe puncte"""
    inside = np.zeros(len(px), bool)
    n = len(vx)
    for i in range(n):
        j = (i - 1) % n
        cond = ((vy[i] > py) != (vy[j] > py))
        with np.errstate(divide='ignore', invalid='ignore'):
            xint = (vx[j]-vx[i]) * (py-vy[i]) / (vy[j]-vy[i]) + vx[i]
        inside ^= cond & (px < xint)
    return inside

def genereaza(poly_ll, az_drum_deg, adancime=35.0, front=18.0,
              drum_interior=8.0, retragere=3.0, jitter=0.05, seed=7):
    """poly_ll: [(lat,lon)...] conturul terenului. az_drum_deg: azimut axa drum (0=N, cw)."""
    rng = np.random.default_rng(seed)
    lat0 = float(np.mean([p[0] for p in poly_ll]))
    lon0 = float(np.mean([p[1] for p in poly_ll]))
    vx, vy = enu([p[0] for p in poly_ll], [p[1] for p in poly_ll], lat0, lon0)

    # sistemul drumului: u_hat = (sin az, cos az) = de-a lungul drumului
    #                    v_hat = (cos az, -sin az) = perpendicular pe drum
    th = math.radians(az_drum_deg)
    c, s = math.cos(th), math.sin(th)
    U = vx*s + vy*c          # proiectie pe u_hat
    V = vx*c - vy*s          # proiectie pe v_hat

    pas_u = front
    pas_v = 2*adancime + drum_interior          # doua siruri spate-in-spate + drum
    u0, u1 = U.min(), U.max()
    v0, v1 = V.min(), V.max()

    loturi = []
    nr = 0
    v = v0 + retragere
    while v + pas_v <= v1:
        for rand in (0, 1):                      # doua siruri pe fiecare banda
            vb = v if rand == 0 else v + adancime + drum_interior
            u = u0 + retragere
            while u + pas_u <= u1:
                # jitter DOAR pe front; adancimea ramane constanta pe banda,
                # altfel randul 2 intra peste banda urmatoare
                w = pas_u * (1 + rng.uniform(-jitter, jitter))
                dcur = adancime
                cu = [u, u+w, u+w, u]
                cv = [vb, vb, vb+dcur, vb+dcur]
                cu = np.array(cu); cv = np.array(cv)
                # inapoi in ENU: p = cu*u_hat + cv*v_hat
                ex = cu*s + cv*c
                ey = cu*c - cv*s
                if pip(ex, ey, vx, vy).all():
                    la, lo = wgs(ex, ey, lat0, lon0)
                    ring = [[float(b), float(a)] for a, b in zip(la, lo)]
                    ring.append(ring[0])
                    nr += 1
                    loturi.append({"type":"Feature",
                        "properties":{"nr": nr, "suprafata_mp": round(w*dcur),
                                      "front_m": round(w,1), "adancime_m": round(dcur,1)},
                        "geometry":{"type":"Polygon","coordinates":[ring]}})
                u += w
        v += pas_v
    return {"type":"FeatureCollection","features":loturi}

if __name__ == "__main__":
    z = json.load(open('zones.json'))['elements']
    w = next(e for e in z if e['id'] == 297015446)          # Corbeanca - Ostratu
    poly = [(p['lat'], p['lon']) for p in w['geometry']]
    fc = genereaza(poly, az_drum_deg=56.0, adancime=32, front=17)
    json.dump(fc, open('parcelare_corbeanca.geojson','w'))
    ar = [f['properties']['suprafata_mp'] for f in fc['features']]
    print(f"loturi generate : {len(ar)}")
    print(f"suprafata min/med/max : {min(ar)} / {int(np.mean(ar))} / {max(ar)} mp")
    print(f"in interval 350-1000 mp : {sum(350<=a<=1000 for a in ar)}/{len(ar)}")
    print(f"total vandabil : {sum(ar)/1e4:.2f} ha")

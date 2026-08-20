import json, math, numpy as np

R = 6378137.0
def enu(lat, lon, lat0, lon0):
    """Local tangent-plane (east,north) in metres. Sub-metre accurate over ~50km."""
    lat = np.asarray(lat, float); lon = np.asarray(lon, float)
    x = np.radians(lon - lon0) * R * math.cos(math.radians(lat0))
    y = np.radians(lat - lat0) * R
    return x, y

def haversine(lat1, lon1, lat2, lon2):
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp = p2 - p1; dl = math.radians(lon2 - lon1)
    a = math.sin(dp/2)**2 + math.cos(p1)*math.cos(p2)*math.sin(dl/2)**2
    return 2*R*math.asin(math.sqrt(a))

def poly_area_centroid(geom, lat0, lon0):
    lats = [g['lat'] for g in geom]; lons = [g['lon'] for g in geom]
    x, y = enu(lats, lons, lat0, lon0)
    if (x[0], y[0]) != (x[-1], y[-1]):
        x = np.append(x, x[0]); y = np.append(y, y[0])
    cr = x[:-1]*y[1:] - x[1:]*y[:-1]
    A = cr.sum()/2.0
    if abs(A) < 1e-9: return 0.0, (np.mean(lats), np.mean(lons))
    cx = ((x[:-1]+x[1:])*cr).sum()/(6*A)
    cy = ((y[:-1]+y[1:])*cr).sum()/(6*A)
    clat = lat0 + math.degrees(cy/R)
    clon = lon0 + math.degrees(cx/(R*math.cos(math.radians(lat0))))
    return abs(A), (clat, clon)

def pt_seg_dist(px, py, ax, ay, bx, by):
    vx, vy = bx-ax, by-ay
    L2 = vx*vx + vy*vy
    t = np.where(L2>0, ((px-ax)*vx + (py-ay)*vy)/np.where(L2>0,L2,1), 0.0)
    t = np.clip(t, 0, 1)
    dx, dy = px-(ax+t*vx), py-(ay+t*vy)
    return np.hypot(dx, dy)

def dist_to_ways(lat, lon, ways):
    """min distance in m from point to a list of ways (each list of {lat,lon})."""
    best = float('inf')
    for w in ways:
        if len(w) < 2: continue
        la = np.array([p['lat'] for p in w]); lo = np.array([p['lon'] for p in w])
        x, y = enu(la, lo, lat, lon)
        d = pt_seg_dist(0.0, 0.0, x[:-1], y[:-1], x[1:], y[1:])
        m = d.min()
        if m < best: best = m
    return best

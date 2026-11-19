import json, re, os, time, urllib.request, urllib.parse
prods=json.load(open('_data/all_products.json'))
FOUR={7212370067654,10986623435063,7089798054086}
def fetch(handle, path):
    if os.path.exists(path) and os.path.getsize(path)>5000: return open(path,encoding='utf-8',errors='ignore').read()
    url="https://6johan.com/products/"+urllib.parse.quote(handle)
    for a in range(4):
        try:
            req=urllib.request.Request(url, headers={'User-Agent':'Mozilla/5.0'})
            with urllib.request.urlopen(req, timeout=30) as r: data=r.read()
            open(path,'wb').write(data)
            time.sleep(1.1)
            return data.decode('utf-8','ignore')
        except Exception as e:
            print('retry',handle,e,flush=True); time.sleep(4+3*a)
    return None
rows=[]
for p in prods:
    h=p['handle']; path=f"_data/after/{h}.html"
    html=fetch(h,path)
    if not html: rows.append({'handle':h,'error':'fetch'}); continue
    m=re.search(r'<script type="application/json" id="sixj-variant-states-(\d+)">(.*?)</script>', html, re.S)
    st=None
    if m:
        try: st=json.loads(m.group(2))
        except Exception: st='parse-error'
    tg=re.search(r'data-sixj-delivery-text>([^<]*)<', html)
    pr=re.search(r'name="properties\[配送区分\]" id="sixj-delivery-prop" value="([^"]*)"', html)
    box={}
    for cls in ['instock','backorder','unavailable']:
        mm=re.search(r'sixj-dbox__inner sixj-dbox--%s"([^>]*)>'%cls, html)
        if mm: box[cls]='hidden' if 'display:none' in mm.group(1) else 'visible'
    rows.append({'handle':h,'id':p['id'],'title':p['title'],'states':st,
                 'trustgrid':tg.group(1) if tg else None,
                 'prop':pr.group(1) if pr else None,'box':box,
                 'lead_labels':dict(re.findall(r"(instock|backorder|unavailable): '([^']*)'", html))})
json.dump(rows,open('_data/audit_after.json','w'),ensure_ascii=False,indent=1)
print('done',len(rows))

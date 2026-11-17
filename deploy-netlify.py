import os, zipfile, io, json, urllib.request, time

TOKEN = 'nfp_3EEWTWtxf2Ef6GP3MpHCkGCx9cbMTejLdace'
SITE_ID = '344a1aa5-78eb-4653-807b-c1365e24eda4'

included_files = [
    'index.html',
    'config.js',
    'sw.js',
    'manifest.webmanifest',
    'favicon.svg',
    'orb.png',
    'orb.webp',
    'icon-192.png',
    'icon-512.png',
    'icon-maskable-512.png',
    'netlify.toml'
]

zip_buffer = io.BytesIO()
with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
    for filename in included_files:
        if os.path.exists(filename):
            zip_file.write(filename, arcname=filename)
            print(f"Added {filename} ({os.path.getsize(filename)} bytes)")

zip_data = zip_buffer.getvalue()
print(f"Created zip package: {len(zip_data)} bytes")

url = f"https://api.netlify.com/api/v1/sites/{SITE_ID}/deploys"
req = urllib.request.Request(
    url,
    data=zip_data,
    headers={
        'Authorization': f'Bearer {TOKEN}',
        'Content-Type': 'application/zip'
    },
    method='POST'
)

with urllib.request.urlopen(req) as resp:
    res = json.loads(resp.read().decode('utf-8'))
    deploy_id = res['id']
    state = res['state']
    print(f"Deploy initiated: {deploy_id}, state: {state}")

for i in range(15):
    time.sleep(1.5)
    chk_req = urllib.request.Request(
        f"https://api.netlify.com/api/v1/sites/{SITE_ID}/deploys/{deploy_id}",
        headers={'Authorization': f'Bearer {TOKEN}'}
    )
    with urllib.request.urlopen(chk_req) as chk_resp:
        chk_res = json.loads(chk_resp.read().decode('utf-8'))
        cur_state = chk_res['state']
        print(f"Polling deploy state: {cur_state}")
        if cur_state == 'ready':
            print(f"Deploy is READY and LIVE at: {chk_res.get('ssl_url') or chk_res.get('url')}")
            break
        elif cur_state == 'error':
            print("Deploy failed with error:", chk_res.get('error_message'))
            break

import requests
r = requests.get('http://localhost:8000/api/maintenance/logs')
print(f'Status: {r.status_code}')
if r.status_code == 200:
    data = r.json()
    print(f'Logs returned: {len(data)}')
    for d in data[:5]:
        print(f"  Log {d['id']}: ext_id={d['extinguisher_id']}, status={d['status']}")
else:
    print(r.text)

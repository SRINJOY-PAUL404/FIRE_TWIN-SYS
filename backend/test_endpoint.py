import urllib.request
import urllib.error

try:
    r = urllib.request.urlopen("http://localhost:8000/api/maintenance/logs")
    print(r.read().decode())
except urllib.error.HTTPError as e:
    print(f"Status: {e.code}")
    print(f"Body: {e.read().decode()}")

cd d:\FIRE_EXTINGUISHER_DT\backend
python -m venv venv
.\venv\Scripts\activate
python -m pip install -r requirements.txt
python seed.py
Start-Process powershell -ArgumentList "-ExecutionPolicy Bypass -NoExit -Command `"cd d:\FIRE_EXTINGUISHER_DT\backend; .\venv\Scripts\activate; python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000`""

cd d:\FIRE_EXTINGUISHER_DT\frontend
npm install
Start-Process powershell -ArgumentList "-ExecutionPolicy Bypass -NoExit -Command `"cd d:\FIRE_EXTINGUISHER_DT\frontend; npm run dev`""

## It's very easy to setup

1. you need python 3 and Django to run this project

```bash
python-3.9.0.exe /quiet InstallAllUsers=1 PrependPath=1 Include_test=0
py -m pip install Django
```

2. after you've done the first step, unzip the folder and use your command line (Windows) or terminal (Linux, IOS) to run the server

**windows**

```shell
cd /d [your path]/semi_solver
python manage.py runserver
```

**Linux**

```shell
cd [your path]/semi_solver
python manage.py runserver
```

3. after the server being started successfully, open a browser and enter: http://127.0.0.1:8000/main/ 
4. the setup is finished, you can change those variables and get the answers directly with steps!
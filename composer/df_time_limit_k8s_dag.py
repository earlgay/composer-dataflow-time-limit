import datetime
from airflow import models
from airflow.contrib.operators import kubernetes_pod_operator

YESTERDAY = datetime.datetime.now() - datetime.timedelta(days=1)

with models.DAG(
        dag_id='composer_dftimelimit_pod',
        schedule_interval=datetime.timedelta(days=1),
        params={
            'PROJECT': 'es-lab2',
            'TIME_LIMIT': '0',
            'REGION': 'us-central1'
        },
        start_date=YESTERDAY) as dag:

    dftimelimit_pod = kubernetes_pod_operator.KubernetesPodOperator(
        task_id='df-time-limit',
        name='df-time-limit',
        namespace='default',
        image='gcr.io/es-lab2/df-time-limit',
        image_pull_policy='Always',
        arguments=['-r', '{{ params.REGION }}',
                   '-l', ' {{ params.TIME_LIMIT }}'])

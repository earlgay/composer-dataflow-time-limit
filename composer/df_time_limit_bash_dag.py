import datetime
import airflow
from airflow.operators import bash_operator

YESTERDAY = datetime.datetime.now() - datetime.timedelta(days=1)

default_args = {
    'owner': 'Airflow',
    'depends_on_past': False,
    'email': [''],
    'email_on_failure': False,
    'email_on_retry': False,
    'retries': 1,
    'retry_delay': datetime.timedelta(minutes=5),
    'start_date': YESTERDAY,
}

with airflow.DAG(
        'df_time_limit',
        'catchup=False',
        default_args=default_args,
        schedule_interval=datetime.timedelta(days=1)) as dag:

    run_df_time_limit = bash_operator.BashOperator(
        task_id='run_df_time_limit',
        bash_command='cd ~/gcs/dags/df-time-limit/; chmod u+x ./df-time-limit; ./df-time-limit -l {{ params.maximum_duration }} -r {{ params.region }}',
        params={'maximum_duration': 0, 'region': 'us-central1'})

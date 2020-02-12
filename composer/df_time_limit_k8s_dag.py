# Copyright 2020 Google LLC
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#      http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

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

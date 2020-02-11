# Composer: Dataflow Time Limit

This application is designed to check Dataflow jobs within a region and cancel any that run beyond a predefined maximum duration. It can be invoked manually, but two [Cloud Composer](https://cloud.google.com/composer) DAGs have been created within the `composer/` folder to allow it to be ran on a schedule; the DAG to use is based on user preference ([BashOperator](https://airflow.apache.org/docs/stable/_api/airflow/operators/bash_operator/index.html#module-airflow.operators.bash_operator) or [KubernetesPodOperator](https://cloud.google.com/composer/docs/how-to/using/using-kubernetes-pod-operator)).

## How to Deploy

### Pre-requisites

1. Run `npm install` to install code dependencies.
2. Run `npm run package` to create the command-line binary.
3. Choose whether you prefer a [BashOperator](https://airflow.apache.org/docs/stable/_api/airflow/operators/bash_operator/index.html#module-airflow.operators.bash_operator) or a [KubernetesPodOperator](https://cloud.google.com/composer/docs/how-to/using/using-kubernetes-pod-operator), and proceed with one of the below.

### Option 1: Cloud Composer - BashOperator

1. Edit `composer/df_time_limit_bash_dag.py`, and modify `schedule_interval` on line 22 according to how often you'd like the check to run.
2. Edit `composer/df_time_limit_bash_dag.py`, and modify `params` on line 27:

```
params={'maximum_duration': 0, 'region': 'us-central1'})
```

3. Within `params`, configure `maximum_duration` to the maximum time limit to allow Dataflow jobs to run (in minutes). For example, enter 1440 for 1 day.
4. Within `params`, configure `region` to the region where the Dataflow jobs reside (e.g. `us-central1`).
5. Import the `df-time-limit` binary to the DAG folder for Cloud Composer:

```
gcloud composer environments storage dags import \
  --environment [COMPOSER_ENVIRONMENT]  --location [REGION] \
  --source bin/df-time-limit \
  --destination df-time-limit/
```

6. Import the DAG to Cloud Composer:

```
gcloud composer environments storage dags import \
  --environment [COMPOSER_ENVIRONMENT]  --location [REGION] \
  --source composer/df_time_limit_bash_dag.py \
  --destination df-time-limit/
```

Variable definitions:

-   [COMPOSER_ENVIRONMENT]: Name of Cloud Composer environment.
-   [REGION]: Region win which to create the environment.

Further documentation:

-   Data Analytics Products > Cloud Composer > Documentation [Adding and Updating DAGs (workflows)](https://cloud.google.com/composer/docs/how-to/using/managing-dags)
-   Python API Reference > airflow.operators > airflow.operators.bash_operator > [airflow.operators.bash_operator](https://airflow.apache.org/docs/stable/_api/airflow/operators/bash_operator/index.html#module-airflow.operators.bash_operator)
-   Airflow > [Scheduling & Triggers](https://airflow.apache.org/docs/stable/scheduler.html)

### Option 2: Cloud Composer - KubernetesPodOperator

1. Run `gcloud builds submit --tag gcr.io/[PROJECT-NAME]/df-time-limit:latest .`
2. Edit `composer/df_time_limit_k8s_dag.py`, and modify `schedule_interval` on line 9 according to how often you'd like the check to run.
3. Edit `composer/df_time_limit_k8s_dag.py`, and modify `params` starting on line 10:
4. Within `params`, configure `TIME_LIMIT` to the maximum time limit to allow Dataflow jobs to run (in minutes). For example, enter 1440 for 1 day.
5. Within `params`, configure `REGION` to the region where the Dataflow jobs reside (e.g. `us-central1`).
6. Within `params`, configure `PROJECT` to [PROJECT-NAME].
7. Import the DAG to Cloud Composer:

```
gcloud composer environments storage dags import \
  --environment [COMPOSER_ENVIRONMENT]  --location [REGION] \
  --source composer/df_time_limit_k8s_dag.py
```

Variable definitions:

-   [PROJECT-NAME]: Name of the project that will houses Cloud Composer and the Container Registry.
-   [COMPOSER_ENVIRONMENT]: Name of Cloud Composer environment.
-   [REGION]: Region win which to create the environment.

Further documentation:

-   Data Analytics Products > Cloud Composer > Documentation [Adding and Updating DAGs (workflows)](https://cloud.google.com/composer/docs/how-to/using/managing-dags)
-   Data Analytics Products > Cloud Composer > Documentation [Using the KubernetesPodOperator](https://cloud.google.com/composer/docs/how-to/using/using-kubernetes-pod-operator)
-   Airflow > [Scheduling & Triggers](https://airflow.apache.org/docs/stable/scheduler.html)

## Testing

**Please note: Testing should ONLY be done in a project that does not have ANY production Dataflow jobs or else those have a risk of being canceled.**

There are several ways to test the service:

1. **Locally**: Run on local machine (Test the binary)
2. **Cloud Composer**: Run through Cloud Composer (Mirror full workflow)

### Testing Locally

You can run this locally on a machine you have `gcloud` and `node` installed and configured.

1. Make sure `gcloud` is configured to point to the project you want this deployed:

```
gcloud config set project [PROJECT_NAME]

```

2. Install node modules:

```
npm install

```

4. Create the binary:

```
npm run package

```

5. Run the binary:

```
eeg3@mars:~/Code/df-time-limit$ ./bin/df-time-limit -l 0 -r us-central1
Checking for jobs that exceed configured maximum duration (0) within us-central1...

No jobs exceeding maximum duration found.

```

### Testing entire workflow through Cloud Composer with a sample Dataflow Job

1. Use this [Interactive Tutorial](https://console.cloud.google.com/dataflow?walkthrough_tutorial_id=dataflow_index) that will create a walkthrough pane in your Google Cloud Console to start a job. Once you reach Step 6 of 9, and you see similar to the following in Cloud Shell, proceed:

```
INFO:apache_beam.runners.dataflow.dataflow_runner:Job 2020-02-11_14_41_13-5412444667028248098 is in state JOB_STATE_RUNNING
```

2. Now that the job is running, let's watch the job and once "Elapsed Time" exceeds 1 minute, go to Cloud Composer, click the DAG, and select "Trigger DAG".

3. Select "Graph View" -> Select the Task -> Select "View Log".

4. Scroll down and you should see output similar to the following in the log:

```
[2020-02-11 22:43:16,554] {base_task_runner.py:101} INFO - Job 23: Subtask df-time-limit [2020-02-11 22:43:16,554] {pod_launcher.py:123} INFO - Event: df-time-limit-e2cf9984 had an event of type Running
[2020-02-11 22:43:16,767] {base_task_runner.py:101} INFO - Job 23: Subtask df-time-limit [2020-02-11 22:43:16,766] {pod_launcher.py:106} INFO - b'Checking for jobs that exceed configured maximum duration ( 0) within us-central1...\n'
[2020-02-11 22:43:16,767] {base_task_runner.py:101} INFO - Job 23: Subtask df-time-limit [2020-02-11 22:43:16,767] {pod_launcher.py:106} INFO - b'\n'
[2020-02-11 22:43:16,771] {base_task_runner.py:101} INFO - Job 23: Subtask df-time-limit [2020-02-11 22:43:16,771] {pod_launcher.py:106} INFO - b'Found job violating maximum duration:\n'
[2020-02-11 22:43:16,771] {base_task_runner.py:101} INFO - Job 23: Subtask df-time-limit [2020-02-11 22:43:16,771] {pod_launcher.py:106} INFO - b'\t ID: 2020-02-11_14_41_13-5412444667028248098\n'
[2020-02-11 22:43:16,771] {base_task_runner.py:101} INFO - Job 23: Subtask df-time-limit [2020-02-11 22:43:16,771] {pod_launcher.py:106} INFO - b'\t Creation Time: 2020-02-11 22:41:14\n'
[2020-02-11 22:43:16,772] {base_task_runner.py:101} INFO - Job 23: Subtask df-time-limit [2020-02-11 22:43:16,771] {pod_launcher.py:106} INFO - b'\t Duration: 2\n'
[2020-02-11 22:43:16,772] {base_task_runner.py:101} INFO - Job 23: Subtask df-time-limit [2020-02-11 22:43:16,772] {pod_launcher.py:106} INFO - b'\n'
[2020-02-11 22:43:16,774] {base_task_runner.py:101} INFO - Job 23: Subtask df-time-limit [2020-02-11 22:43:16,774] {pod_launcher.py:106} INFO - b'\n'
[2020-02-11 22:43:16,775] {base_task_runner.py:101} INFO - Job 23: Subtask df-time-limit [2020-02-11 22:43:16,775] {pod_launcher.py:106} INFO - b'Attempting to stop job: 2020-02-11_14_41_13-5412444667028248098\n'
[2020-02-11 22:43:17,671] {base_task_runner.py:101} INFO - Job 23: Subtask df-time-limit [2020-02-11 22:43:17,671] {pod_launcher.py:106} INFO - b'Stopped job (2020-02-11_14_41_13-5412444667028248098) successfully!\n'
[2020-02-11 22:43:22,687] {base_task_runner.py:101} INFO - Job 23: Subtask df-time-limit [2020-02-11 22:43:22,686] {pod_launcher.py:123} INFO - Event: df-time-limit-e2cf9984 had an event of type Succeeded
[2020-02-11 22:43:22,687] {base_task_runner.py:101} INFO - Job 23: Subtask df-time-limit [2020-02-11 22:43:22,687] {pod_launcher.py:186} INFO - Event with job id df-time-limit-e2cf9984 Succeeded
[2020-02-11 22:43:22,694] {base_task_runner.py:101} INFO - Job 23: Subtask df-time-limit [2020-02-11 22:43:22,693] {pod_launcher.py:123} INFO - Event: df-time-limit-e2cf9984 had an event of type Succeeded
[2020-02-11 22:43:22,694] {base_task_runner.py:101} INFO - Job 23: Subtask df-time-limit [2020-02-11 22:43:22,694] {pod_launcher.py:186} INFO - Event with job id df-time-limit-e2cf9984 Succeeded
```

5. Go to the Dataflow console, and you should see "Canceled" under the "Status" column for the job that was created. If so, dataflow-time-limit successfully canceled the job.

## FAQ

-   **Q:** I am receiving an error: `Unable to obtain list of dataflow jobs.`
-   **A:** Ensure the Dataflow API is actually enabled: `gcloud services enable dataflow.googleapis.com`. The service also assumes Cloud Composer is using a service account that has permission to cancel dataflow jobs. The particular service account in use can be checked through: `gcloud composer environments describe [COMPOSER_ENVIRONMENT_NAME]--location [REGION] | grep serviceAccount`.

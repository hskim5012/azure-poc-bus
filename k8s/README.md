# Running on Kubernetes with KEDA

This directory contains the necessary manifests to run the worker application on Azure Kubernetes Service (AKS) or any generic Kubernetes cluster with KEDA installed.

## Prerequisites

1. Access to a Kubernetes cluster (e.g., AKS, Minikube, Docker Desktop with k8s).
2. [KEDA installed](https://keda.sh/docs/latest/deploy/) on the cluster.
3. Your Azure Service Bus Connection String.
4. Docker installed to build constraints.

## Deployment Steps

### 1. Build and Push the Docker Image

First, build the Docker image for the worker:
```bash
docker build -t asb-worker:latest ..
```

If you are using AKS, you will want to push this image to Azure Container Registry (ACR) and update `k8s/deployment.yaml` with the ACR image path.

### 2. Configure the Secret

Open `k8s/secret.yaml` and replace `"your_connection_string_here"` with your actual Azure Service Bus connection string. *Do not commit this file with your real connection string!*

Alternatively, you can apply it directly via:
```bash
kubectl create secret generic asb-secrets --from-literal=AZURE_SERVICEBUS_CONNECTION_STRING='Endpoint=sb://...'
```

### 3. Deploy the application

Apply the Secret, Deployment, and KEDA configurations to your cluster:

```bash
kubectl apply -f deployment.yaml
kubectl apply -f keda.yaml
```

### 4. Test Autoscaling

1. Check your KEDA `ScaledObject` status:
   ```bash
   kubectl get scaledobject asb-worker-scaledobject
   ```
2. Initially, since there are no messages, you should see 0 pods running:
   ```bash
   kubectl get pods -l app=asb-worker
   ```
3. From your local machine, run the setup script to ensure topics exist:
   ```bash
   npm run setup-infrastructure
   ```
4. Trigger a workflow from the interactive CLI menu:
   ```bash
   npm run dev
   # Choose option 2 to send a WorkflowStarted event
   ```
5. Watch the pods scale up!
   ```bash
   kubectl get pods -w
   ```
   You will see the KEDA operator detect the message and instantly scale your deployment from 0 to 1 instance.

6. Wait 30 seconds after the message is processed. Once the subscriptions are empty, the pod is gracefully terminated and scaled back down to 0.


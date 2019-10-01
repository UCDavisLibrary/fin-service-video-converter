#! /bin/bash

PROJECT_ID=digital-ucdavis-edu
CONTAINER_NAME=fin-service-video-converter
IMAGE=gcr.io/$PROJECT_ID/$CONTAINER_NAME

gcloud builds submit --tag $IMAGE

gcloud beta run deploy fin-service-video-converter \
  --image $IMAGE \
  --platform managed \
  --set-env-vars=SERVICE_NAME=video-service-dev \
  --service-account=326679616213-compute@developer.gserviceaccount.com
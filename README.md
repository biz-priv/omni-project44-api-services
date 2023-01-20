# omni-project44-api-services

### Steps to Deploy
#### Build and Deploy Image to ECR (Currently Manual deployment for docker buil and push)
* aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin (omni-legacy-account-number).dkr.ecr.us-east-1.amazonaws.com
* cd P44BatchLoad
* docker build --platform linux/amd64 -t omni-dw-project44-batch-prod:1 .
* docker image ls
* docker tag (image-id) (omni-legacy-account-number).dkr.ecr.us-east-1.amazonaws.com/omni-dw-project44-batch-prod:1
* docker push (omni-legacy-account-number).dkr.ecr.us-east-1.amazonaws.com/omni-dw-project44-batch-prod:1


#### Package dependencies 
* npm i serverless
* npm i
* cd lib/nodejs
* npm i

#### Deployment instructions 
* sls deploy -s prod
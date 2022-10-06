# omni-project44-api-services
omni-project44-api-services


Steps to Deploy
1. Build and Deploy Image to ECR

aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 332281781429.dkr.ecr.us-east-1.amazonaws.com
docker build --platform linux/amd64 -t omni-dw-project44-batch-${env.ENVIRONMENT}:1 .
docker push 332281781429.dkr.ecr.us-east-1.amazonaws.com/omni-dw-project44-batch-${env.ENVIRONMENT}:1


2. npm installation

npm i serverless
npm i
cd lib/nodejs
npm i
cd ../..
serverless --version
sls deploy -s ${env.ENVIRONMENT}
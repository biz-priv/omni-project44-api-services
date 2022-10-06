pipeline {
    agent { label 'ecs' }
    stages {
        stage('Set parameters') {
            steps {
                script{
                    echo "GIT_BRANCH: ${GIT_BRANCH}"
                    echo sh(script: 'env|sort', returnStdout: true)
                    if ("${GIT_BRANCH}".contains("feature") || "${GIT_BRANCH}".contains("bugfix") || "${GIT_BRANCH}".contains("develop")) {
                        env.ENVIRONMENT=env.getProperty("environment_develop")
                    } else if ("${GIT_BRANCH}".contains("master") || "${GIT_BRANCH}".contains("hotfix")){
                        env.ENVIRONMENT=env.getProperty("environment_prod")
                    }
                    sh """
                    echo "Environment: "${env.ENVIRONMENT}
                    """
                }
            }
        }
        stage('Install Docker'){
            steps{
                script{
                    sh """
                    curl -fsSLO https://get.docker.com/builds/Linux/x86_64/docker-17.04.0-ce.tgz \
                    && tar xzvf docker-17.04.0-ce.tgz \
                    && mv docker/docker /usr/local/bin \
                    && rm -r docker docker-17.04.0-ce.tgz
                    """
                }
            }
        }
        // TODO - bicloud Jenkins needs Docker Installed.
        stage('ECR Deploy'){
            steps {
                script{
                    if(fileExists("P44BatchLoad/Dockerfile")){
                        dir("./P44BatchLoad"){
                            withAWS(credentials: 'omni-aws-creds'){
                                sh """ 
                                aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 332281781429.dkr.ecr.us-east-1.amazonaws.com
                                docker build --platform linux/amd64 -t omni-dw-project44-batch-${env.ENVIRONMENT}:1 .
                                docker push 332281781429.dkr.ecr.us-east-1.amazonaws.com/omni-dw-project44-batch-${env.ENVIRONMENT}:1
                                """
                            }
                        }
                    }
                }
            }
        }

        stage('Omni Deploy'){
            when {
                anyOf {
                    branch 'feature/*';
                    branch 'bugfix/*'
                    branch 'develop';
                    branch 'master'
                }
                expression {
                    return true;
                }
            }
            steps {
                withAWS(credentials: 'omni-aws-creds'){
                    sh """
                    npm i serverless
                    npm i
                    cd lib/nodejs
                    npm i
                    cd ../..
                    serverless --version
                    sls deploy -s ${env.ENVIRONMENT}
                    """
                }
            }
        }
    }
}

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

        stage('ECR deploy'){
             steps {
                script { 
                    def docker_home = tool name: 'docker', type: 'dockerTool'
                    def docker_path = "${docker_home}/bin/docker"
                    sh ''' 
                    docker login -u AWS https://332281781429.dkr.ecr.us-east-1.amazonaws.com -p $(aws ecr get-login-password --region us-east-1)
                    '''
                }
            }
        }

        stage('Omni Deploy'){
            when {
                anyOf {
                    branch 'feature/*';
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

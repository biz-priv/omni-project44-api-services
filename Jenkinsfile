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
                script{
                        docker.withRegistry('https://332281781429.dkr.ecr.us-east-1.amazonaws.com', 'ecr:us-east-1:omni-aws-creds') {
                        def project44_image = docker.build('omni-dw-project44-batch-${env.ENVIRONMENT}')
                    project44_image.push("${env.BUILD_NUMBER}")
                    project44_image.push("latest")
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

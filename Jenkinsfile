pipeline {
    agent { label 'ecs' }
    stages {
        stage('Set parameters') {
            steps {
                script{
                    echo "GIT_BRANCH: ${GIT_BRANCH}"
                    echo sh(script: 'env|sort', returnStdout: true)
                    if ("${GIT_BRANCH}".contains("feature") || "${GIT_BRANCH}".contains("bugfix") || "${GIT_BRANCH}".contains("devint")) {
                        env.ENVIRONMENT=env.getProperty("environment_devint")
                    }
                    sh """
                    echo "Environment: "${env.ENVIRONMENT}
                    """
                }
            }
        }
        stage('Code Deploy'){
            when {
                anyOf {
                    branch 'devint';
                    branch 'feature/*';
                    branch 'bugfix/*';
                }
                expression {
                    return true;
                }
            }
            steps {
                withAWS(credentials: 'bizdev-aws-creds'){
                    sh """
                    npm i serverless
                    npm i
                    serverless --version
                    sls deploy -s ${env.ENVIRONMENT}
                    """
                }
            }
        }
    }
}

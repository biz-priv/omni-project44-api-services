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

        // stage('Omni Deploy'){
        //     when {
        //         anyOf {
        //             branch 'develop';
        //             branch 'master';
        //         }
        //         expression {
        //             return true;
        //         }
        //     }
        //     steps {
        //         withAWS(credentials: 'omni-aws-creds'){
        //             sh """
        //             npm i serverless
        //             npm i
        //             cd lib/nodejs
        //             npm i
        //             cd ../..
        //             serverless --version
        //             sls deploy -s ${env.ENVIRONMENT}
        //             """
        //         }
        //     }
        // }
    }
}

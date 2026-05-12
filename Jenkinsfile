pipeline {
  agent any

  options {
    timestamps()
    disableConcurrentBuilds()
  }

  environment {
    API_URL = 'http://localhost:4000'
    WEB_URL = 'http://localhost:3019'
  }

  stages {
    stage('Install') {
      steps {
        sh 'npm ci'
      }
    }

    stage('Lint') {
      steps {
        sh 'npm run lint'
      }
    }

    stage('Build') {
      steps {
        sh 'npm run build'
      }
    }

    stage('Docker Build') {
      steps {
        sh 'docker compose -f deploy/docker-compose.yml build'
      }
    }

    stage('Deploy Local Demo') {
      when {
        anyOf {
          branch 'main'
          environment name: 'DEPLOY_LOCAL', value: 'true'
        }
      }
      steps {
        sh 'npm run docker:deploy'
      }
    }

    stage('Smoke Test') {
      when {
        anyOf {
          branch 'main'
          environment name: 'DEPLOY_LOCAL', value: 'true'
        }
      }
      steps {
        sh 'npm run smoke'
      }
    }
  }

  post {
    always {
      sh 'docker compose -f deploy/docker-compose.yml ps || true'
    }
  }
}

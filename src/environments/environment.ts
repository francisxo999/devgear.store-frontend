export const environment = {
  production: false,
  msalConfig: {
    auth: {
      clientId: '9182d5b6-da2c-4b41-849b-9887785e3cf0',
      authority: 'https://login.microsoftonline.com/e5372bf0-c5e3-4286-887c-79069f209c1f',
      redirectUri: 'http://localhost:4200'
    }
  },
  apiConfig: {
    scopes: ['api://9182d5b6-da2c-4b41-849b-9887785e3cf0/DevGear.Access'],
    uri: 'http://localhost:8080/api'
  }
};
var config = {};

config.facebook = {
    clientID: '627894833920815',
    clientSecret: '4fd2d37ebce400d56f5eb2ffb1c0f203',
    callbackURL: 'http://localhost:9000/auth/facebook/callback',
    groupID: '287310791394228'
};

config.database = {
    development: 'mongodb://localhost/bunutan',
    production: ''
};

config.secret = 'ea41226968faa04877dc99b3874e8fdcdae7bf2bf0fe487389bacd4aacefcb3ac315cf716075a103ca89d5b97c0f279a62cf824f73d8eb91c2fc3193037914d9'

module.exports = config;


'use strict';

var express = require('express');
var config = require('./config');
var http = require('http');
var path = require('path');
var async = require('async');
var hbs = require('express-hbs');
var baucis = require('baucis');
var socketIO = require('socket.io');
var mongoose = require('mongoose');
var passport = require('passport');
var FacebookStrategy = require('passport-facebook').Strategy;
var app = express();
var Auth = require('./middlewares/authorization.js');
var graph = require('fbgraph');

var authenticatedOrNot = function(req, res, next) {
    if(req.isAuthenticated()) {
        next();
    }
    else {
        res.redirect('auth/facebook');
    }
};

// start mongoose
mongoose.connect(config.database[app.settings.env]);
var db = mongoose.connection;

db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function callback () {


    var memberSchema = new mongoose.Schema({
        fbid: String,
        fbname: String,
        pickid: String,
        pickname: String,
        token: String,
        admin: Boolean
    });

    var Member = mongoose.model('member', memberSchema);


    /* set Baucis */
    var controller = baucis.rest({
        singular: 'member'
    });

    //controller.request(function (request, response, next) {
        //if (request.isAuthenticated()) return next();
        //return response.send(401);
    //});

    app.configure(function() {
        app.set('port', 9000);

        app.set('view engine', 'handlebars');
        app.set('views', __dirname + '../app/scripts/views');
    });

    app.use(express.cookieParser());
    app.use(express.bodyParser());
    app.use(express.session({ secret: config.secret }));

    app.use(passport.initialize());
    app.use(passport.session());

    app.use('/api/v1', baucis());

    // simple log
    app.use(function(req, res, next){
        console.log('%s %s', req.method, req.url);
        next();
    });

    // mount static
    app.use(express.static( path.join( __dirname, '../app') ));
    app.use(express.static( path.join( __dirname, '../.tmp') ));

    // Initialize Facebook Credentials
    passport.use(new FacebookStrategy({
        clientID: config.facebook.clientID,
        clientSecret: config.facebook.clientSecret,
        callbackURL: config.facebook.callbackURL
      },
      function(accessToken, refreshToken, profile, done) {
        graph.setAccessToken(accessToken);

        Member.count({}, function(err, count) {
            if(count === 0) {
                graph.get(config.facebook.groupID + '?fields=members', function(err, res) {
                    res.members.data.map(function(member) {
                        var newMember = new Member();
                        newMember.fbid = member.id;
                        newMember.fbname = member.name;
                        newMember.admin = member.administrator;
                        newMember.save(function(err) {
                            if(err) { throw err; }
                        });
                    });
                });
            }
        });

        Member.findOne({fbid: profile.id}, function(err, member) {
            if(member) {
                member.token = accessToken;
                member.save(function(err) {
                    if(err) { throw err; }
                    done(null, member);
                });
            }
        });
      }
    ));


    passport.serializeUser(function(user, done) {
        done(null, user.id);
    });

    passport.deserializeUser(function(id, done) {
        Member.findById(id, function(err, user) {
            if(err) done(err);
            if(user) done(null, user);
        });
    });

    // route index.html
    //app.get('/', Auth.isAuthenticated, function(req, res){
        //console.log("test");
        //res.sendfile( path.join( __dirname, '../app/index.html' ) );
    //});

    // route facebook authenticate
    app.get('/auth/facebook', passport.authenticate('facebook'));
    app.get('/auth/facebook/callback', passport.authenticate('facebook', {
        successRedirect: '/api/v1/members',
        failureRedirect: '/'
    }));

    // start server
    http.createServer(app).listen(app.get('port'), function(){
        console.log('Express App started!');
    });
});

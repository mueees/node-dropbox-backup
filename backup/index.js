var util = require('util'),
    fs = require('fs'),
    dbox = require('dbox'),
    async = require('async'),
    Q = require("q"),
    exec = require('child_process').exec,
    config = JSON.parse(fs.readFileSync('config.json').toString('utf-8'));

function Backup(){}

Backup.prototype = {

    execute: function(){
        var _this = this;
        this.folder = this.getFolderName();
        this.mainDir = config.dir + "/" + this.folder;

        var methods = [];

        methods.push(function (cb) {
            _this.makeDir(_this.mainDir).then(function(){cb(null)});
        });

        methods.push(function (cb) {
            _this.copyProjects().then(function(){cb(null)});
        });

        methods.push(function (cb) {
            _this.compress(_this.folder).then(function(){cb(null)});
        });

        methods.push(function (cb) {
            var fileName = _this.folder + '.tar.gz'
            _this.sendToDropbox(fileName, config.local_backup_dir + '/' + fileName).then(function(){cb(null)});
        });

        methods.push(function (cb) {
            _this.clearFolder(config.dir).then(function(){cb(null)});
        });

        methods.push(function (cb) {
            _this.clearFolder(config.local_backup_dir).then(function(){cb(null)});
        });

        async.waterfall(methods, function(err){
            console.log("ALL TASKS DONE!");
        })
    },

    getFolderName: function () {
        var date = new Date();
        return date.getDate() + "." + date.getMonth() + "." + date.getFullYear() + "_" + date.getHours() + ":" + date.getMinutes();
    },

    copyProjects: function(){
        var deferred = Q.defer();
        var projects = config.projects,
            project,
            methods = [],
            _this = this;


        for(var i = 0; i < projects.length; i++){
            project = projects[i];
            (function (project) {
                var projectDir = _this.mainDir + '/' + project.name;
                var dbDir = projectDir + '/db';

                //folder for all files and db
                methods.push(function (cb) {
                    _this.makeDir(projectDir).done(function(){cb(null)});
                });

                //copy project files
                if(project.pathToFiles){
                    methods.push(function (cb) {
                        _this.copyFiles(project.pathToFiles, projectDir).done(function(){cb(null)});
                    });
                }

                if(project.db){
                    //mongodump

                    methods.push(function (cb) {
                        _this.makeDir(dbDir).done(function(){cb(null)});
                    });

                    methods.push(function (cb) {
                        _this.mongodump(project.db, dbDir).done(function(){cb(null)});
                    });
                }

            })(project);
        }

        async.waterfall(methods, function(){
            util.puts('Projects was copied');
            deferred.resolve();
        });

        return deferred.promise;
    },

    makeDir: function(path){
        var deferred = Q.defer();
        exec("mkdir " + path, function(err, stdout, stderr){
            if (err){
                util.error('Error creating ' + path );
                util.puts(stdout);
                util.puts(stderr);
                process.exit();
                return;
            }

            util.puts('Created local ' + path );
            deferred.resolve();
        });
        return deferred.promise;
    },

    copyFiles: function(from, to){
        var deferred = Q.defer();
        util.puts('Start copy from ' + from + ' to ' + to );
        exec("cp -r " + from + " " + to, function(err, stdout, stderr){
            if (err){
                util.error('Error copy from' + from + ' to ' + to );
                util.puts(stdout);
                util.puts(stderr);
                process.exit();
                return;
            }

            util.puts('copy from' + from + ' to ' + to );
            deferred.resolve();
        });
        return deferred.promise;
    },

    mongodump: function(dbName, to){
        var deferred = Q.defer();
        util.puts('Start mongodump db: ' + dbName );
        exec("mongodump --db " + dbName + " --out " + to, function(err, stdout, stderr){
            if (err){
                util.error('Error mongodump ' + dbName );
                util.puts(stdout);
                util.puts(stderr);
                process.exit();
                return;
            }

            util.puts('Mongodump ' + dbName );
            deferred.resolve();
        });
        return deferred.promise;
    },

    compress: function(tarName){
        var deferred = Q.defer();
        util.puts('Tar start compress ' + tarName  );

        exec('cd '+ config.pahtToBackupDir + '; tar -zcpvf backup_temp_dropbox/' + tarName + '.tar.gz ' + 'backup_temp/' + tarName, {maxBuffer: 1024 * 1024  * 1024}, function(err, stdout, stderr){
            if (err){
                util.error('Error tar ' + tarName );
                util.puts(err);
                process.exit();
                return;
            }

            util.puts('Tar  ' + tarName + " complete" );
            deferred.resolve();
        })

        return deferred.promise;
    },

    sendToDropbox: function(fileName, path){
        var deferred = Q.defer();
        var app = dbox.app({
            'app_key': config.app_key,
            'app_secret': config.app_secret
        });

        var client = app.client(config.access_token);

        util.puts('Start reading file ' );
        fs.readFile(path, function(err, data){

            if (err){
                util.error('Error reading ' + path)
                process.exit();
                return
            }

            util.puts('Start updaloading file'  );
            client.put( fileName, data, function(status, reply){
                util.puts('Upload completed (status: ' + status + ')');
                deferred.resolve();
            })
        });

        return deferred.promise;
    },

    clearFolder: function(path){
        var deferred = Q.defer();

        exec('rm -r '+ path + '/*', function(err, stdout, stderr){
            if (err){
                util.error('Error clearFolder ' + path );
                util.puts(stdout);
                util.puts(stderr);
                process.exit();
                return;
            }

            util.puts('ClearFolder  ' + path);
            deferred.resolve();
        })

        return deferred.promise;
    }

};

module.exports = Backup;
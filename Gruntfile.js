/* global module:false */
module.exports = function(grunt) {

    // Project configuration.
    grunt.initConfig({
        // Metadata.
        pkg: grunt.file.readJSON('package.json'),
        banner: '/*! <%= pkg.title || pkg.name %> - v<%= pkg.version %> - ' +
            '<%= grunt.template.today("yyyy-mm-dd") %>\n' +
            '<%= pkg.homepage ? "* " + pkg.homepage + "\\n" : "" %>' +
            '* Copyright (c) <%= grunt.template.today("yyyy") %> <%= pkg.author.name %>;' +
            ' Licensed <%= _.pluck(pkg.licenses, "type").join(", ") %> */\n',
        // Task configuration.
        uglify: {
            types: { files: { 'bin/js/min/lib/type.js': ['src/lib/type/type.js'] } },
            utils: { files: { 'bin/js/min/lib/utils.js': ['src/lib/utils.js'] } },
            object: { files: { 'bin/js/min/lib/object.js': ['src/lib/object/object.js'] } },
            sokoban: { files: { 'bin/js/min/game/sokoban.js': ['src/sokoban.js'] } }
        },
        copy: {
            main: {
                files: [{ expand: true, src: ['src/lib/**.js', 'src/lib/*/**.js'],
                          dest: 'bin/js/lib', flatten: true },
                        { expand: true, src: ['src/sokoban.js'],
                          dest: 'bin/js/game', flatten: true },
                        { expand: true, src: ['src/server.js'],
                          dest: 'bin/', flatten: true },
                        { expand: true, src: ['node_modules/lodash/lodash.js'],
                          dest: 'bin/js/lib', flatten: true },
                        { expand: true, src: 'node_modules/lodash/dist/lodash.min.js',
                          dest: 'bin/js/min/lib', flatten: true,
                          rename: function (dest, src) {
                              return dest + '/' + src.replace('.min', '');
                          } },
                        { expand: true, src: 'node_modules/requirejs/require.js',
                          dest: 'bin/js/', flatten: true }]
            }
        },
        jshint: {
            options: {
                curly: true,
                eqeqeq: true,
                immed: true,
                latedef: true,
                newcap: true,
                noarg: true,
                sub: true,
                undef: true,
                unused: true,
                boss: true,
                eqnull: true,
                browser: true,
                globals: {}
            },
            gruntfile: {
                src: 'Gruntfile.js'
            }
        },
        jasmine: {
            files: ['spec/*.js']
        },
        watch: {
            gruntfile: {
                files: '<%= jshint.gruntfile.src %>',
                tasks: ['jshint:gruntfile']
            },
            lib_test: {
                files: '<%= jshint.lib_test.src %>',
                tasks: ['jshint:lib_test', 'qunit']
            }
        }
    });

    // These plugins provide necessary tasks.
    grunt.loadNpmTasks('grunt-contrib-concat');
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-contrib-jasmine');
    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-contrib-copy');

    // Default task.
    grunt.registerTask('default', ['jshint', 'jasmine', 'copy']);
    grunt.registerTask('deploy', ['jshint', 'jasmine', 'uglify']);
};

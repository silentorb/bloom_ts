module.exports = function (grunt) {

  grunt.loadNpmTasks('grunt-ts')
  grunt.loadNpmTasks('grunt-contrib-concat')
  grunt.loadNpmTasks('grunt-contrib-watch')
  grunt.loadNpmTasks('grunt-contrib-copy')
  grunt.loadNpmTasks('grunt-text-replace')

  grunt.initConfig({
    ts: {
      bloom: {                                 // a particular target
        src: ["js/bloom.ts", "js/garden.ts"],        // The source typescript files, http://gruntjs.com/configuring-tasks#files
//        out: 'js/bloom.js',                // If specified, generate an out.js file which is the merged js file
        options: {                    // use to override the default options, http://gruntjs.com/configuring-tasks#options
          target: 'es5',            // 'es3' (default) | 'es5'
          declaration: true,       // true | false  (default)
          verbose: true
        }
      }
    },
    concat: {
      options: {
        separator: ''
      },
      "bloom-def": {
        src: [
          'js/bloom.d.ts',
          'js/bloom_definition_footer.txt'
        ],
        dest: 'js/bloom.d.ts'
      },
      "garden-def": {
        src: [
          'js/garden.d.ts',
          'js/garden_definition_footer.txt'
        ],
        dest: 'js/garden.d.ts'
      }
    },
    replace: {
      "bloom-def": {
        src: ['js/bloom.d.ts'],             // source files array (supports minimatch)
        overwrite: true,
        replacements: [
          {
            from: 'export = Bloom;',                   // string replacement
            to: ''
          }
        ]
      },
      "garden-def": {
        src: ['js/garden.d.ts'],             // source files array (supports minimatch)
        overwrite: true,
        replacements: [
          {
            from: 'export declare',                   // string replacement
            to: 'declare'
          },
          {
            from: 'export = Garden;',                   // string replacement
            to: ''
          }
        ]
      }
    },
    copy: {
      "bloom-def": {
        files: [
          { src: 'js/bloom.d.ts', dest: '../../defs/bloom.d.ts'},
          { src: 'js/garden.d.ts', dest: '../../defs/garden.d.ts'}
        ]
      }
    },
    watch: {
      bloom: {
        files: 'js/**/*.ts',
        tasks: ['default'],
        options: {
          atBegin: true
        }
      }
    }
  })

  grunt.registerTask('default', ['ts', 'concat', 'replace', 'copy']);

}
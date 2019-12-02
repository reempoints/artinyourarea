var gulp = require('gulp');

var changed = require('gulp-changed'),
    del = require('del'),
    autoprefixer = require('gulp-autoprefixer'),
    npmDist = require('gulp-npm-dist'),
    rename = require('gulp-rename'),
    cleanCSS = require('gulp-clean-css'),
    sourcemaps = require('gulp-sourcemaps'),
    sass = require('gulp-sass'),
    bs = require('browser-sync').create(),
    path = require('path'),
    chalk = require('chalk');

var srcMarkupFiles = 'pages/*.html'
var srcSassFiles = 'scss/style.default.scss'

var distMainDir = 'dist/'
var distPageDir = 'dist/'
var distStyleDir = 'dist/css/'

var distVendorDir = 'dist/vendor/'

var copy = ['js/**', 'img/**', 'fonts/**', 'css/custom.css', 'favicon.png', 'icons/**', 'docs/**']


var config = {
    autoprefixer: {
        cascade: false
    },
    browserSync: {
        enabled: true
    },
    sass: {
        outputStyle: 'expanded',
        includePaths: ['src/scss']
    }
}

// Clean the dist folder - for clean builds
gulp.task('clean', function () {
    return del([
        distMainDir + '**/*'
    ]);
});


// Copy changed HTML
gulp.task('html', function () {
    return gulp.src(srcMarkupFiles)
        // only pass changed files
        .pipe(changed(distMainDir))
        //save all the files
        .pipe(gulp.dest(distMainDir));

});

// Dev SASS Task - no sourcemaps, no autoprefixing, no minification
gulp.task('sass-dev', function () {
    return gulp.src(srcSassFiles)
        .pipe(sass(config.sass).on('error', sass.logError))
        .pipe(gulp.dest(distStyleDir));
});


// Build SASS Task - sourcemaps,autoprefixing, minification
gulp.task('sass-build', function () {
    return gulp.src(srcSassFiles)
        .pipe(sourcemaps.init())
        .pipe(sass(config.sass).on('error', sass.logError))
        .pipe(autoprefixer(config.autoprefixer))
        .pipe(gulp.dest(distStyleDir))
        .pipe(cleanCSS())
        .pipe(rename({
            suffix: '.min'
        }))
        .pipe(sourcemaps.write('.'))
        .pipe(gulp.dest(distStyleDir));
});

// Copy folders defined in copy array
gulp.task('copy', function () {
    return getFoldersSrc('pages', copy)
        .pipe(changed(distMainDir))
        .pipe(gulp.dest(distPageDir));

});

// Copy 3rd party modules to the vendor directory based on our package.json dependencies
// If running in dev mode w/ Browser Sync, there is no watcher set for this, it executes
// only when calling initial `gulp` command or you run `gulp vendor` separately
gulp.task('vendor', function () {
    return gulp.src(npmDist({
            copyUnminified: true
        }), {
            base: './node_modules/'
        })
        .pipe(rename(function (path) {
            path.dirname = path.dirname.replace(/\/distribute/, '').replace(/\\distribute/, '').replace(/\/dist/, '').replace(/\\dist/, '');
        }))
        .pipe(gulp.dest(distVendorDir));
});


// Default Gulp Task 
// 1. Process HTML, vendor dir, SCSS and copy static assets
// 2. Init Browser Sync 
// 3. Watch SCSS files, HTML files and static assets
gulp.task('default', gulp.series(
    gulp.parallel('html', 'vendor', 'sass-dev', 'copy'),
    serve,
    watch));

// Build Gulp Task 
// 1. Clean dist folder
// 2. Process HTML, vendor dir, SCSS w/ source maps and minification and copy static assets
gulp.task('build', gulp.series(
    'clean',
    gulp.parallel('vendor', 'html', 'sass-build', 'copy'))
);



// Helper functions

function reload(done) {
    bs.reload();
    done();
}

function serve(done) {
    bs.init({
        server: {
            baseDir: distPageDir
        },
        files: [
            distStyleDir + '*.css'
        ]
    });
    done();
}

function watch(done) {

    gulp.watch("scss/**/*.scss", gulp.series('sass-dev'));
    gulp.watch("pages/*.html", gulp.series('html', reload));
    gulp.watch(getFolders('pages', copy), gulp.series('copy', reload));

    console.log(chalk.yellow('Now watching files for changes...'));

    done();
}

function getFolders(base, folders) {
    return folders.map(function (item) {
        return path.join(base, item);
    });
};

function getFoldersSrc(base, folders) {
    return gulp.src(folders.map(function (item) {
        return path.join(base, item);
    }), {
        base: base,
        allowEmpty: true
    });
};
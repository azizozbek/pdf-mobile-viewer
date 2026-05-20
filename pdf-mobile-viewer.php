<?php
/**
 * Plugin Name: PDF Mobile Viewer
 * Description: Renders PDF file blocks with PDF.js on mobile devices for inline viewing.
 * Version: 1.1.0
 * Author: Aziz Ozbek
 * Author URI: azizozbek.ch
 * Text Domain: pdf-mobile-viewer
 * License: GPL-2.0+
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

define( 'PMV_VERSION', '1.1.0' );
define( 'PMV_URL', plugin_dir_url( __FILE__ ) );
define( 'PMV_PDFJS_VERSION', '3.11.174' );
define( 'PMV_PDFJS_CDN', 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/' . PMV_PDFJS_VERSION );

/**
 * Enqueue PDF.js from CDN + our mobile viewer script/style.
 */
function pmv_enqueue_assets() {
    wp_enqueue_script(
        'pdfjs',
        PMV_PDFJS_CDN . '/pdf.min.js',
        [],
        PMV_PDFJS_VERSION,
        [ 'strategy' => 'defer', 'in_footer' => true ]
    );

    wp_enqueue_script(
        'pmv-viewer',
        PMV_URL . 'js/pdf-mobile-viewer.js',
        [ 'pdfjs' ],
        PMV_VERSION,
        [ 'strategy' => 'defer', 'in_footer' => true ]
    );

    wp_localize_script( 'pmv-viewer', 'pmvConfig', ['workerSrc' => PMV_PDFJS_CDN . '/pdf.worker.min.js',] );

    wp_enqueue_style(
        'pmv-viewer',
        PMV_URL . 'css/pdf-mobile-viewer.css',
        [],
        PMV_VERSION
    );
}
add_action( 'wp_enqueue_scripts', 'pmv_enqueue_assets' );

<?php
$dir = 'blogs/';
$files = array_diff(scandir($dir), array('.', '..'));

$blogs = [];
foreach ($files as $file) {
    if (pathinfo($file, PATHINFO_EXTENSION) == 'html') {
        $blogs[] = [
            'title' => basename($file, '.html'),
            'url' => $dir . $file
        ];
    }
}

header('Content-Type: application/json');
echo json_encode($blogs);
?>

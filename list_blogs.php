<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">
    <title>Chris Lindeman - Blog</title>
    <link href="tailwind_theme/tailwind.css" rel="stylesheet" type="text/css">
    <script>
        function filterBlogs() {
            const input = document.getElementById('searchInput');
            const filter = input.value.toLowerCase();
            const cards = document.getElementsByClassName('blog-card');

            Array.from(cards).forEach(function(card) {
                const title = card.getElementsByClassName('blog-title')[0].innerText;
                if (title.toLowerCase().includes(filter)) {
                    card.style.display = '';
                } else {
                    card.style.display = 'none';
                }
            });
        }
    </script>
</head>
<body class="text-gray-500">
    <header>
        <nav class="py-2 sticky top-0 z-50 bg-white shadow">
            <div class="container mx-auto relative">
                <nav class="flex flex-wrap items-center px-4">
                    <a href="index.html" class="font-bold font-serif hover:text-opacity-75 inline-flex items-center leading-none mr-4 space-x-1 text-black text-xl uppercase">
                        <span>Chris Lindeman</span>
                    </a>
                    <button class="hover:bg-secondary-500 hover:text-white ml-auto px-3 py-2 rounded text-secondary-500 lg:hidden" data-name="nav-toggler">
                        <span class="block border-b-2 border-current my-1 w-6"></span>
                        <span class="block border-b-2 border-current my-1 w-6"></span>
                        <span class="block border-b-2 border-current my-1 w-6"></span>
                    </button>
                    <div class="flex-1 hidden space-y-2 w-full lg:flex lg:items-center lg:space-x-4 lg:space-y-0 lg:w-auto" data-name="nav-menu">
                        <div class="flex flex-col mx-auto lg:flex-row">
                            <a href="index.html" class="hover:text-gray-400 lg:p-4 py-2 text-gray-500">Home</a>
                            <a href="about.html" class="hover:text-gray-400 lg:p-4 py-2 text-gray-500">About</a>
                            <a href="works.html" class="hover:text-gray-400 lg:p-4 py-2 text-gray-500">Works</a>
                            <a href="services.html" class="hover:text-gray-400 lg:p-4 py-2 text-gray-500">Services</a>
                            <a href="blog.php" class="hover:text-gray-400 lg:p-4 py-2 text-gray-500">Blog</a>
                            <a href="contact.html" class="hover:text-gray-400 lg:p-4 py-2 text-gray-500">Contact</a>
                        </div>
                        <div class="flex-wrap gap-2 inline-flex items-center py-1">
                            <a href="#" class="bg-primary-500 hover:bg-primary-400 inline-block px-6 py-2 rounded text-white">Let's Talk</a>
                        </div>
                    </div>
                </nav>
            </div>
        </nav>
    </header>

    <main>
        <section class="bg-gray-100 text-center py-24">
            <div class="container mx-auto px-4">
                <h1 class="font-bold text-4xl text-gray-900 md:leading-tight lg:leading-tight lg:text-5xl mb-6">Chris Lindeman's Blog</h1>
                <p class="mb-6 text-lg text-gray-700">Insights, updates, and stories from my journey as an AI Systems Engineer.</p>
                <input id="searchInput" type="text" onkeyup="filterBlogs()" placeholder="Search blogs..." class="mb-6 px-4 py-2 rounded border border-gray-300 focus:border-primary-500 focus:outline-none">
                <div class="flex flex-wrap justify-center">
                    <?php
                    $dir = 'blogs';
                    if (is_dir($dir)) {
                        if ($dh = opendir($dir)) {
                            while (($file = readdir($dh)) !== false) {
                                if ($file != '.' && $file != '..' && pathinfo($file, PATHINFO_EXTENSION) == 'html') {
                                    $filePath = $dir . '/' . $file;
                                    $htmlContent = file_get_contents($filePath);
                                    preg_match('/<title>(.*?)<\/title>/', $htmlContent, $matches);
                                    $title = $matches[1] ?? 'No title';
                                    $excerpt = substr(strip_tags($htmlContent), 0, 150) . '...';
                                    echo '<div class="blog-card w-full md:w-1/2 lg:w-1/3 p-4">';
                                    echo '<div class="bg-white rounded-lg shadow-lg overflow-hidden">';
                                    echo '<div class="p-4">';
                                    echo '<h2 class="blog-title font-bold text-xl text-gray-900 mb-2">' . $title . '</h2>';
                                    echo '<p class="text-gray-700 mb-4">' . $excerpt . '</p>';
                                    echo '<a href="' . $filePath . '" class="bg-primary-500 hover:bg-primary-400 text-white px-4 py-2 rounded">Read More</a>';
                                    echo '</div>';
                                    echo '</div>';
                                    echo '</div>';
                                }
                            }
                            closedir($dh);
                        }
                    }
                    ?>
                </div>
            </div>
        </section>
    </main>

    <footer class="bg-gray-900 bg-opacity-90 py-12 text-gray-400">
        <div class="container mx-auto px-4">
            <div class="-mx-4 flex flex-wrap items-center">
                <div class="mr-auto p-4 w-full md:w-9/12 lg:w-8/12 xl:w-6/12">
                    <h2 class="font-bold font-serif mb-4 text-3xl text-white">Interested To Work Together?</h2>
                    <p>I am happy to connect with potential collaborators, clients, interns, and anyone interested in what I do.</p>
                </div>
                <div class="p-4 w-full md:w-auto">
                    <a href="#" class="bg-primary-500 hover:bg-primary-400 inline-block px-6 py-2 rounded text-white">Get In Touch</a>
                </div>
            </div>
            <div class="-mx-4 flex flex-wrap items-center">
                <div class="p-4 w-full sm:w-6/12 lg:w-3/12 xl:w-4/12">
                    <a href="#" class="font-bold font-serif hover:text-opacity-90 inline-flex items-center leading-none space-x-2 text-3xl text-primary-500 uppercase">
                        <span>CHRIS LINDEMAN</span>
                    </a>
                </div>
                <div class="p-4 w-full sm:w-6/12 lg:flex-1 lg:order-last">
                    <div class="flex-wrap inline-flex leading-none space-x-2">
                        <a href="#" class="border border-white hover:bg-white hover:text-gray-900 p-2 rounded-full text-white" aria-label="facebook">
                            <svg viewBox="0 0 24 24" fill="currentColor" class="h-5 w-5">
                                <path d="M14 13.5h2.5l1-4H14v-2c0-1.03 0-2 2-2h1.5V2.14c-.326-.043-1.557-.14-2.857-.14C11.928 2 10 3.657 10 6.7v2.8H7v4h3V22h4v-8.5z"></path>
                            </svg>
                        </a>
                        <a href="#" class="border border-white hover:bg-white hover:text-gray-900 p-2 rounded-full text-white" aria-label="twitter">
                            <svg viewBox="0 0 24 24" fill="currentColor" class="h-5 w-5">
                                <path d="M22.162 5.656a8.384 8.384 0 0 1-2.402.658A4.196 4.196 0 0 0 21.6 4c-.82.488-1.719.83-2.656 1.015a4.182 4.182 0 0 0-7.126 3.814 11.874 11.874 0 0 1-8.62-4.37 4.168 4.168 0 0 0-.566 2.103c0 1.45.738 2.731 1.86 3.481a4.168 4.168 0 0 1-1.894-.523v.052a4.185 4.185 0 0 0 3.355 4.101 4.21 4.21 0 0 1-1.89.072A4.185 4.185 0 0 0 7.97 16.65a8.394 8.394 0 0 1-6.191 1.732 11.83 11.83 0 0 0 6.41 1.88c7.693

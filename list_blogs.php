<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">
    <title>Chris Lindeman - Blog</title>
    <link href="tailwind_theme/tailwind.css" rel="stylesheet" type="text/css">
    <style>
        .content {
            max-width: 800px;
            margin: auto;
            padding: 20px;
            background: #fff;
            border-radius: 8px;
            box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
        }
        .header {
            text-align: center;
            margin-bottom: 20px;
        }
        .header h1 {
            font-size: 2.5rem;
            color: #333;
        }
        .main-content h2, .main-content h3 {
            color: #333;
        }
        .main-content p, .main-content ul {
            color: #555;
        }
        .main-content ul {
            padding-left: 20px;
        }
        .main-content ul li {
            margin-bottom: 10px;
        }
        .graphic img {
            width: 100%;
            height: auto;
            margin-top: 20px;
            border-radius: 8px;
        }
        .graphic caption {
            display: block;
            text-align: center;
            color: #777;
            margin-top: 10px;
        }
        .search-bar {
            margin-bottom: 20px;
            text-align: center;
        }
        .search-bar input {
            width: 80%;
            padding: 10px;
            border: 1px solid #ccc;
            border-radius: 4px;
        }
    </style>
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
                <div class="search-bar">
                    <input type="text" id="search" placeholder="Search blog posts..." onkeyup="filterPosts()">
                </div>
                <div id="posts-container" class="flex flex-wrap justify-center">
                    <?php
                    $blogDirectory = 'blogs/';
                    $files = scandir($blogDirectory);

                    foreach($files as $file) {
                        if ($file !== '.' && $file !== '..') {
                            $filePath = $blogDirectory . $file;
                            $fileContents = file_get_contents($filePath);
                            preg_match('/<title>(.*?)<\/title>/', $fileContents, $matches);
                            $title = $matches[1];
                            $description = substr(strip_tags($fileContents), 0, 150) . '...';
                            echo '<div class="w-full md:w-1/2 lg:w-1/3 p-4 post">';
                            echo '<div class="bg-white rounded-lg shadow-lg overflow-hidden">';
                            echo '<img src="https://via.placeholder.com/400x200" alt="' . $title . '" class="w-full h-48 object-cover">';
                            echo '<div class="p-4">';
                            echo '<h2 class="font-bold text-xl text-gray-900 mb-2">' . $title . '</h2>';
                            echo '<p class="text-gray-700 mb-4">' . $description . '</p>';
                            echo '<a href="' . $filePath . '" class="bg-primary-500 hover:bg-primary-400 text-white px-4 py-2 rounded">Read More</a>';
                            echo '</div></div></div>';
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
                                <path d="M22.162 5.656a8.384 8.384 0 0 1-2.402.658A4.196 4.196 0 0 0 21.6 4c-.82.488-1.719.83-2.656 1.015a4.182 4.182 0 0 0-7.126 3.814 11.874 11.874 0 0 1-8.62-4.37 4.168 4.168 0 0 0-.566 2.103c0 1.45.738 2.731 1.86 3.481a4.168 4.168 0 0 1-1.894-.523v.052a4.185 4.185 0 0 0 3.355 4.101 4.21 4.21 0 0 1-1.89.072A4.185 4.185 0 0 0 7.97 16.65a8.394 8.394 0 0 1-6.191 1.732 11.83 11.83 0 0 0 6.41 1.88c7.693 0 11.9-6.373 11.9-11.9 0-.18-.005-.362-.013-.54a8.496 8.496 0 0 0 2.087-2.165z"></path>
                            </svg>
                        </a>
                        <a href="#" class="border border-white hover:bg-white hover:text-gray-900 p-2 rounded-full text-white" aria-label="instagram">
                            <svg viewBox="0 0 24 24" fill="currentColor" class="h-5 w-5">
                                <path d="M12 2c2.717 0 3.056.01 4.122.06 1.065.05 1.79.217 2.428.465.66.254 1.216.598 1.772 1.153a4.908 4.908 0 0 1 1.153 1.772c.247.637.415 1.363.465 2.428.047 1.066.06 1.405.06 4.122 0 2.717-.01 3.056-.06 4.122-.05 1.065-.218 1.79-.465 2.428a4.883 4.883 0 0 1-1.153 1.772 4.915 4.915 0 0 1-1.772 1.153c-.637.247-1.363.415-2.428.465-1.066.047-1.405.06-4.122.06-2.717 0-3.056-.01-4.122-.06-1.065-.05-1.79-.218-2.428-.465a4.89 4.89 0 0 1-1.772-1.153 4.904 4.904 0 0 1-1.153-1.772c-.248-.637-.415-1.363-.465-2.428C2.013 15.056 2 14.717 2 12c0-2.717.01-3.056.06-4.122.05-1.066.217-1.79.465-2.428a4.88 4.88 0 0 1 1.153-1.772A4.897 4.897 0 0 1 5.45 2.525c.638-.248 1.362-.415 2.428-.465C8.944 2.013 9.283 2 12 2zm0 5a5 5 0 1 0 0 10 5 5 0 0 0 0-10zm6.5-.25a1.25 1.25 0 0 0-2.5 0 1.25 1.25 0 0 0 2.5 0zM12 9a3 3 0 1 1 0 6 3 3 0 0 1 0-6z"></path>
                            </svg>
                        </a>
                        <a href="#" class="border border-white hover:bg-white hover:text-gray-900 p-2 rounded-full text-white" aria-label="linkedin">
                            <svg viewBox="0 0 24 24" fill="currentColor" class="h-5 w-5">
                                <path d="M19.989 11.572a7.96 7.96 0 0 0-1.573-4.351 9.749 9.749 0 0 1-.92.87 13.157 13.157 0 0 1-3.313 2.01c.167.35.32.689.455 1.009v.003a9.186 9.186 0 0 1 .11.27c1.514-.17 3.11-.108 4.657.101.206.028.4.058.584.088zm-9.385-7.45a46.164 46.164 0 0 1 2.692 4.27c1.223-.482 2.234-1.09 3.048-1.767a7.88 7.88 0 0 0 .796-.755A7.968 7.968 0 0 0 12 4a8.05 8.05 0 0 0-1.396.121zM4.253 9.997a29.21 29.21 0 0 0 2.04-.123 31.53 31.53 0 0 0 4.862-.822 54.365 54.365 0 0 0-2.7-4.227 8.018 8.018 0 0 0-4.202 5.172zm1.53 7.038c.388-.567.898-1.205 1.575-1.899 1.454-1.49 3.17-2.65 5.156-3.29l.062-.018c-.165-.364-.32-.689-.476-.995-1.836.535-3.77.869-5.697 1.042-.94.085-1.783.122-2.403.128a7.967 7.967 0 0 0 1.784 5.032zm9.222 2.38a35.947 35.947 0 0 0-1.632-5.709c-2.002.727-3.597 1.79-4.83 3.058a9.77 9.77 0 0 0-1.317 1.655A7.964 7.964 0 0 0 12 20a7.977 7.977 0 0 0 3.005-.583zm1.873-1.075a7.998 7.998 0 0 0 2.987-4.87c-.34-.085-.771-.17-1.245-.236a12.023 12.023 0 0 0-3.18-.033 39.368 39.368 0 0 1 1.438 5.14zM12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"></path>
                            </svg>
                        </a>
                        <a href="#" class="border border-white hover:bg-white hover:text-gray-900 p-2 rounded-full text-white" aria-label="youtube">
                            <svg viewBox="0 0 24 24" fill="currentColor" class="h-5 w-5">
                                <path d="M7.443 5.35c.639 0 1.23.05 1.77.198a3.83 3.83 0 0 1 1.377.544c.394.247.689.594.885 1.039.197.445.295.99.295 1.583 0 .693-.147 1.286-.491 1.731-.295.446-.787.841-1.377 1.138.836.248 1.475.693 1.868 1.286.394.594.64 1.336.64 2.177 0 .693-.148 1.286-.394 1.781-.246.495-.639.94-1.082 1.237a5.078 5.078 0 0 1-1.573.692c-.59.149-1.18.248-1.77.248H1V5.35h6.443zm-.394 5.54c.541 0 .984-.148 1.328-.395.344-.247.492-.693.492-1.237 0-.297-.05-.594-.148-.791-.098-.198-.246-.347-.442-.495-.197-.099-.394-.198-.64-.247-.246-.05-.491-.05-.787-.05H4v3.216h3.05zm.148 5.838c.295 0 .59-.05.836-.099a1.72 1.72 0 0 0 .688-.297 1.76 1.76 0 0 0 .492-.544c.098-.247.197-.544.197-.89 0-.693-.197-1.188-.59-1.534-.394-.297-.935-.445-1.574-.445H4v3.81h3.197zm9.492-.05c.393.396.983.594 1.77.594.541 0 1.033-.148 1.426-.395.394-.297.64-.594.738-.891h2.41c-.394 1.187-.984 2.028-1.77 2.572-.788.495-1.722.792-2.853.792a5.753 5.753 0 0 1-2.115-.396 3.93 3.93 0 0 1-1.574-1.088 3.93 3.93 0 0 1-.983-1.633c-.246-.643-.345-1.335-.345-2.127 0-.742.099-1.434.345-2.078a5.34 5.34 0 0 1 1.032-1.682c.443-.445.984-.84 1.574-1.088a5.49 5.49 0 0 1 2.066-.396c.836 0 1.574.149 2.213.495.64.346 1.131.742 1.525 1.336a6.01 6.01 0 0 1 .885 1.88c.098.692.147 1.385.098 2.176H16c0 .792.295 1.534.689 1.93zm3.098-5.194c-.344-.346-.885-.544-1.525-.544-.442 0-.787.099-1.082.247-.295.149-.491.347-.688.545a1.322 1.322 0 0 0-.344.692c-.05.248-.099.445-.099.643h4.426c-.098-.742-.344-1.236-.688-1.583zM15.459 6.29h5.508v1.336H15.46V6.29z"></path>
                            </svg>
                        </a>
                    </div>
                </div>
                <div class="p-4 w-full sm:w-6/12 md:flex-1 lg:w-3/12">
                    <a href="tel:+0 123-456-789" class="hover:text-gray-400 text-white text-xl">+1 412-636-3647</a>
                </div>
                <div class="p-4 w-full sm:w-6/12 md:flex-1 lg:w-3/12">
                    <a href="info@company.com" class="hover:text-gray-400 text-white text-xl">chris@clindeman.com</a>
                </div>
            </div>
        </div>
    </footer>

    <script>
        function filterPosts() {
            const searchInput = document.getElementById('search').value.toLowerCase();
            const posts = document.querySelectorAll('.post');
            
            posts.forEach(post => {
                const title = post.querySelector('h2').textContent.toLowerCase();
                if (title.includes(searchInput)) {
                    post.style.display = '';
                } else {
                    post.style.display = 'none';
                }
            });
        }
    </script>
</body>
</html>
export function About() {
    return (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="mb-8">
                <h1 className="text-3xl font-semibold">About PhotoVault</h1>
                <p className="text-neutral-400 mt-1">
                    Self-hosted photo library
                </p>
            </div>

            <div className="space-y-6 text-neutral-300">
                <section>
                    <h2 className="text-xl font-semibold mb-3">Overview</h2>
                    <p className="leading-relaxed">
                        PhotoVault is an intelligent digital asset management system that helps you
                        organize, search, and manage your photo collection with automatic metadata indexing.
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-semibold mb-3">Key Features</h2>
                    <ul className="list-disc list-inside space-y-2 leading-relaxed">
                        <li>Search by place, camera, tag, or filename</li>
                        <li>Automatic EXIF metadata extraction</li>
                        <li>Reverse geocoding for location data</li>
                        <li>Interactive map view for geotagged photos</li>
                        <li>Advanced filtering and sorting</li>
                        <li>HEIC/HEIF support with automatic conversion</li>
                    </ul>
                </section>

                <section>
                    <h2 className="text-xl font-semibold mb-3">Technology Stack</h2>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <h3 className="font-medium mb-2">Frontend</h3>
                            <ul className="text-sm text-neutral-400 space-y-1">
                                <li>React + TypeScript</li>
                                <li>Vite</li>
                                <li>TailwindCSS</li>
                                <li>React Query</li>
                            </ul>
                        </div>
                        <div>
                            <h3 className="font-medium mb-2">Backend</h3>
                            <ul className="text-sm text-neutral-400 space-y-1">
                                <li>FastAPI (Python)</li>
                                <li>SQLAlchemy</li>
                                <li>Pillow (Image Processing)</li>
                            </ul>
                        </div>
                    </div>
                </section>

                <section className="pt-4 border-t border-neutral-800">
                    <p className="text-sm text-neutral-500">
                        Version 1.0.0 • Built with ❤️ for photographers and content creators
                    </p>
                </section>
            </div>
        </div>
    );
}

import { useState, useEffect } from 'react';
import Sidebar from '../sidebar';
import Navbar from '../layout/Navbar';

const Layout = ({ children }) => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [isMobile, setIsMobile] = useState(false);

    // Check if we're on mobile
    useEffect(() => {
        const checkIfMobile = () => {
            setIsMobile(window.innerWidth < 1024); // 1024px is the lg breakpoint
        };

        checkIfMobile();
        window.addEventListener('resize', checkIfMobile);
        return () => window.removeEventListener('resize', checkIfMobile);
    }, []);

    const toggleSidebar = () => {
        // Only toggle if we're on mobile
        if (isMobile) {
            setIsSidebarOpen(!isSidebarOpen);
        }
    };

    return (
        <div className="flex h-screen w-screen overflow-hidden bg-[#F2F4F5] font-sans text-[#1A1A1A]">
            {/* Sidebar - fixed width on desktop, slide in/out on mobile */}
            <div className={`fixed lg:relative h-full z-50
                ${isMobile ? 'w-[200px]' : 'w-[170px] lg:w-[190px]'}
                ${isMobile && !isSidebarOpen ? '-translate-x-full' : 'translate-x-0'}
                transition-all duration-300 ease-in-out`}>
                <Sidebar isOpen={isSidebarOpen} onClose={toggleSidebar} />
            </div>

            {/* Main Content Area */}
            <div className="flex flex-col flex-1">
                {/* Header */}
                <Navbar />

                {/* Main Content */}
                <main className="flex-1 min-w-0 overflow-y-auto px-1.5 md:px-2">
                    {children}
                </main>
            </div>

            {/* Mobile Overlay */}
            {isMobile && isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                    onClick={toggleSidebar}
                />
            )}
        </div>
    );
};

export default Layout; 
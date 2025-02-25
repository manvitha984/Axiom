export default function Footer() {
    return (
      <footer className="bg-black text-white py-6">
        <div className="max-w-7xl mx-auto text-center">
          <p className="text-sm">
            &copy; {new Date().getFullYear()} All rights reserved to AdaCode.
          </p>
        </div>
      </footer>
    );
  }
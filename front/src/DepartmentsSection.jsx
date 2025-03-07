function classNames(...classes) {
    return classes.filter(Boolean).join(" ");
  }
  
  export default function DepartmentsSection() {
    return (
      <section className="bg-[#FFF8F8] py-16 px-8">
        <div className="max-w-7xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-gray-900">
            Different departments use Axiom for various operations
          </h2>
          <div className="mt-8 flex justify-center space-x-7">
            {["Finance & Accounting", "Human Resources", "Customer Support", "Sales & Marketing", "Company-wide Automation"].map(
              (department, index) => (
                <div
                  key={index}
                  className={classNames(
                    department === "Marketing"
                      ? "bg-black text-white"
                      : "bg-white text-black",
                    "border rounded-full px-5 py-3 shadow-md flex items-center justify-center font-medium text-lg w-48"
                  )}
                >
                  {department}
                </div>
              )
            )}
          </div>
        </div>
      </section>
    );
  }
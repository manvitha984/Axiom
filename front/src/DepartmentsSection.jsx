import { DollarSign, Users, MessageSquare, BarChart, Zap } from "lucide-react";

export default function DepartmentsSection() {
  const departments = [
    { 
      name: "Finance & Accounting", 
      icon: DollarSign,
      description: "Automated invoice processing and financial data extraction"
    },
    { 
      name: "Human Resources", 
      icon: Users,
      description: "Document processing and employee communication analysis"
    },
    { 
      name: "Customer Support", 
      icon: MessageSquare,
      description: "Email sentiment analysis and automated response generation"
    },
    { 
      name: "Sales & Marketing", 
      icon: BarChart,
      description: "Campaign performance tracking and customer insights"
    },
    { 
      name: "Company-wide Automation", 
      icon: Zap,
      description: "Cross-functional workflow optimization and integration"
    }
  ];

  return (
    <section className="bg-gradient-to-b from-[#FFF8F8] to-white py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto text-center">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">
          Solutions for Every Department
        </h2>
        <div className="h-1 w-20 bg-[#FE6059] mx-auto mb-6 rounded-full"></div>
        <p className="text-lg text-gray-600 max-w-3xl mx-auto mb-12">
          Different departments use Axiom for various operations, streamlining workflows and enhancing productivity across your organization.
        </p>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-12">
          {departments.map((dept, index) => (
            <div
              key={index}
              className="bg-white rounded-xl shadow-md p-6 transform transition-all duration-300 hover:-translate-y-2 hover:shadow-lg border border-gray-100 group"
            >
              <div className="w-14 h-14 bg-[#FE6059]/10 rounded-xl p-3 mx-auto mb-4 flex items-center justify-center group-hover:bg-[#FE6059] transition-colors">
                <dept.icon className="h-7 w-7 text-[#FE6059] group-hover:text-white transition-colors" />
              </div>
              
              <h3 className="text-xl font-semibold text-gray-800 mb-2">
                {dept.name}
              </h3>
              
              <p className="text-gray-600">
                {dept.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
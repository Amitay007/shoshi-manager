import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, 
  Legend, ResponsiveContainer, Line, ComposedChart 
} from "recharts";
import { 
  TrendingUp, TrendingDown, Wallet, ChevronDown, ChevronRight, 
  DollarSign, FileText, PieChart 
} from "lucide-react";
import BackHomeButtons from "@/components/common/BackHomeButtons";
import { Badge } from "@/components/ui/badge";

// --- Mock Data Generator ---
const generateMonthlyData = (min, max) => {
  return Array.from({ length: 12 }, () => Math.floor(Math.random() * (max - min + 1)) + min);
};

const years = ["2024", "2025", "2026"];
const months = [
  "ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני",
  "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר"
];

// Initial Data Structure based on request
const createInitialData = () => {
  const data = {};
  
  years.forEach(year => {
    data[year] = {
      income: [
        { 
          id: "inc1", 
          name: "משרד החינוך", 
          subItems: [
            { id: "inc1-1", name: "מענקים שוטפים", monthly: generateMonthlyData(10000, 50000) },
            { id: "inc1-2", name: "פרויקטים מיוחדים", monthly: generateMonthlyData(5000, 20000) }
          ]
        },
        { 
          id: "inc2", 
          name: "פרטיים", 
          subItems: [
            { id: "inc2-1", name: "סדנאות פרטיות", monthly: generateMonthlyData(2000, 15000) },
            { id: "inc2-2", name: "מכירת ציוד", monthly: generateMonthlyData(1000, 8000) }
          ]
        },
        { 
          id: "inc3", 
          name: "מתנסים", 
          subItems: [
            { id: "inc3-1", name: "חוגים שנתיים", monthly: generateMonthlyData(8000, 25000) },
            { id: "inc3-2", name: "אירועי שיא", monthly: generateMonthlyData(3000, 12000) }
          ]
        },
        { 
          id: "inc4", 
          name: "מוסדות", 
          subItems: [
            { id: "inc4-1", name: "בתי ספר תיכוניים", monthly: generateMonthlyData(15000, 40000) },
            { id: "inc4-2", name: "מכללות", monthly: generateMonthlyData(5000, 15000) }
          ]
        }
      ],
      expenses: [
        { 
          id: "exp1", 
          name: "ניהול וכללי", 
          subItems: [
            { id: "exp1-1", name: "שכירות משרד", monthly: generateMonthlyData(4000, 4000) },
            { id: "exp1-2", name: "ארנונה וחשמל", monthly: generateMonthlyData(1000, 2000) },
            { id: "exp1-3", name: "כיבוד וניקיון", monthly: generateMonthlyData(500, 1500) }
          ]
        },
        { 
          id: "exp2", 
          name: "שיווק ומכירות", 
          subItems: [
            { id: "exp2-1", name: "קמפיינים דיגיטליים", monthly: generateMonthlyData(3000, 10000) },
            { id: "exp2-2", name: "כנסים", monthly: generateMonthlyData(0, 5000) }
          ]
        },
        { 
          id: "exp3", 
          name: "שכר עבודה", 
          subItems: [
            { id: "exp3-1", name: "משכורות בסיס", monthly: generateMonthlyData(40000, 45000) },
            { id: "exp3-2", name: "בונוסים", monthly: generateMonthlyData(0, 10000) },
            { id: "exp3-3", name: "הפרשות סוציאליות", monthly: generateMonthlyData(8000, 10000) }
          ]
        },
        { 
          id: "exp4", 
          name: "תפעול", 
          subItems: [
            { id: "exp4-1", name: "רכש ציוד VR", monthly: generateMonthlyData(5000, 20000) },
            { id: "exp4-2", name: "תחזוקה", monthly: generateMonthlyData(1000, 3000) },
            { id: "exp4-3", name: "רישיונות תוכנה", monthly: generateMonthlyData(2000, 2000) }
          ]
        },
        { 
          id: "exp5", 
          name: "מימון", 
          subItems: [
            { id: "exp5-1", name: "עמלות בנק", monthly: generateMonthlyData(200, 500) },
            { id: "exp5-2", name: "ריבית הלוואות", monthly: generateMonthlyData(1000, 1500) }
          ]
        }
      ]
    };
  });
  return data;
};

// Helper to calculate totals
const calculateCategoryTotal = (category) => {
  const monthlyTotals = Array(12).fill(0);
  category.subItems.forEach(sub => {
    sub.monthly.forEach((val, idx) => monthlyTotals[idx] += val);
  });
  const total = monthlyTotals.reduce((a, b) => a + b, 0);
  return { monthlyTotals, total };
};

const calculateGrandTotal = (categories) => {
  const monthlyTotals = Array(12).fill(0);
  categories.forEach(cat => {
    cat.subItems.forEach(sub => {
      sub.monthly.forEach((val, idx) => monthlyTotals[idx] += val);
    });
  });
  const total = monthlyTotals.reduce((a, b) => a + b, 0);
  return { monthlyTotals, total };
};

export default function CashFlow() {
  const [cashFlowData, setCashFlowData] = useState(createInitialData());
  const [selectedYear, setSelectedYear] = useState("2025");
  const [expandedRows, setExpandedRows] = useState({});

  const toggleRow = (id) => {
    setExpandedRows(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const currentYearData = cashFlowData[selectedYear];
  const incomeStats = useMemo(() => calculateGrandTotal(currentYearData.income), [currentYearData]);
  const expensesStats = useMemo(() => calculateGrandTotal(currentYearData.expenses), [currentYearData]);
  
  const netBalance = incomeStats.total - expensesStats.total;
  const monthlyBalance = incomeStats.monthlyTotals.map((inc, i) => inc - expensesStats.monthlyTotals[i]);
  
  // Calculate cumulative balance
  let runningBalance = 0;
  const cumulativeBalance = monthlyBalance.map(bal => {
    runningBalance += bal;
    return runningBalance;
  });

  // Chart Data Preparation
  const chartData = months.map((month, index) => ({
    name: month,
    income: incomeStats.monthlyTotals[index],
    expenses: expensesStats.monthlyTotals[index],
    balance: cumulativeBalance[index]
  }));

  const formatCurrency = (val) => new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 }).format(val);

  const CategoryRow = ({ category, isExpense = false }) => {
    const { monthlyTotals, total } = calculateCategoryTotal(category);
    const isExpanded = expandedRows[category.id];

    return (
      <>
        <tr 
          className={`hover:bg-slate-50 cursor-pointer transition-colors border-b border-slate-100 ${isExpanded ? 'bg-slate-50' : ''}`}
          onClick={() => toggleRow(category.id)}
        >
          <td className="p-3 sticky right-0 bg-white md:bg-transparent z-10 shadow-sm md:shadow-none font-bold text-slate-800 flex items-center gap-2">
            {isExpanded ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
            {category.name}
          </td>
          {monthlyTotals.map((val, idx) => (
            <td key={idx} className="p-3 text-left text-sm text-slate-600 font-mono min-w-[80px]">
              {val.toLocaleString()}
            </td>
          ))}
          <td className={`p-3 text-left font-bold font-mono min-w-[100px] ${isExpense ? 'text-red-600' : 'text-green-600'}`}>
            {total.toLocaleString()}
          </td>
        </tr>
        {isExpanded && category.subItems.map(sub => (
          <tr key={sub.id} className="bg-slate-50/50 border-b border-slate-100 text-xs">
            <td className="p-2 pr-8 sticky right-0 bg-slate-50 md:bg-transparent z-10 text-slate-500 font-medium">
              {sub.name}
            </td>
            {sub.monthly.map((val, idx) => (
              <td key={idx} className="p-2 text-left text-slate-500 font-mono">
                {val.toLocaleString()}
              </td>
            ))}
            <td className="p-2 text-left font-semibold text-slate-700 font-mono">
              {sub.monthly.reduce((a, b) => a + b, 0).toLocaleString()}
            </td>
          </tr>
        ))}
      </>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 lg:p-8" dir="rtl">
      <div className="max-w-[1600px] mx-auto space-y-6">
        
        {/* Header & Year Selector */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
              <PieChart className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-slate-900">לוח פיננסי</h1>
              <p className="text-slate-500 font-medium">ניהול תזרים ותקציב שנתי</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <Tabs value={selectedYear} onValueChange={setSelectedYear} className="w-full md:w-auto">
              <TabsList className="bg-white border border-slate-200 shadow-sm p-1 h-11">
                {years.map(year => (
                  <TabsTrigger 
                    key={year} 
                    value={year}
                    className="px-6 data-[state=active]:bg-purple-600 data-[state=active]:text-white font-bold"
                  >
                    {year}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
            <BackHomeButtons />
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-0 shadow-md bg-white overflow-hidden relative">
            <div className="absolute top-0 right-0 w-1.5 h-full bg-green-500"></div>
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-bold text-slate-500 mb-1">סה"כ הכנסות</p>
                  <h2 className="text-3xl font-black text-green-600">{formatCurrency(incomeStats.total)}</h2>
                </div>
                <div className="p-2 bg-green-50 rounded-lg">
                  <TrendingUp className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md bg-white overflow-hidden relative">
            <div className="absolute top-0 right-0 w-1.5 h-full bg-red-500"></div>
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-bold text-slate-500 mb-1">סה"כ הוצאות</p>
                  <h2 className="text-3xl font-black text-red-600">{formatCurrency(expensesStats.total)}</h2>
                </div>
                <div className="p-2 bg-red-50 rounded-lg">
                  <TrendingDown className="w-6 h-6 text-red-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md bg-gradient-to-br from-purple-600 to-indigo-600 text-white overflow-hidden relative">
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-bold text-purple-100 mb-1">מאזן נטו שנתי</p>
                  <h2 className="text-3xl font-black text-white">{formatCurrency(netBalance)}</h2>
                </div>
                <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                  <Wallet className="w-6 h-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <Card className="border-0 shadow-md">
          <CardHeader>
            <CardTitle className="text-lg font-bold text-slate-800">ניתוח פיננסי חודשי</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[350px] w-full" dir="ltr">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} />
                  <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} tickFormatter={(val) => `₪${val/1000}k`} />
                  <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fill: '#8b5cf6' }} />
                  <RechartsTooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    formatter={(value) => formatCurrency(value)}
                  />
                  <Legend />
                  <Bar yAxisId="left" dataKey="income" name="הכנסות" fill="#22c55e" radius={[4, 4, 0, 0]} barSize={20} />
                  <Bar yAxisId="left" dataKey="expenses" name="הוצאות" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={20} />
                  <Line yAxisId="right" type="monotone" dataKey="balance" name="מאזן מצטבר" stroke="#8b5cf6" strokeWidth={3} dot={{ r: 4, fill: "#8b5cf6" }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Data Grid */}
        <Card className="border-0 shadow-md overflow-hidden">
          <CardHeader className="bg-slate-50 border-b border-slate-100">
            <CardTitle className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <FileText className="w-5 h-5 text-purple-600" />
              פירוט תנועות
            </CardTitle>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-slate-500 border-b border-slate-200">
                  <th className="p-3 text-right font-bold min-w-[200px] sticky right-0 bg-slate-50 z-20">קטגוריה</th>
                  {months.map(m => <th key={m} className="p-3 text-left font-bold min-w-[80px]">{m}</th>)}
                  <th className="p-3 text-left font-bold min-w-[100px] text-purple-700">סה"כ</th>
                </tr>
              </thead>
              <tbody>
                {/* Income Section */}
                <tr className="bg-green-50/50 border-b border-green-100">
                  <td colSpan={14} className="p-3 font-black text-green-800 sticky right-0 bg-green-50/50 z-10">הכנסות</td>
                </tr>
                {currentYearData.income.map(cat => (
                  <CategoryRow key={cat.id} category={cat} />
                ))}
                <tr className="bg-green-100 border-t-2 border-green-200 font-bold">
                  <td className="p-3 sticky right-0 bg-green-100 z-10 text-green-900">סה"כ הכנסות</td>
                  {incomeStats.monthlyTotals.map((val, idx) => (
                    <td key={idx} className="p-3 text-left font-mono text-green-900">{val.toLocaleString()}</td>
                  ))}
                  <td className="p-3 text-left font-mono text-green-900">{incomeStats.total.toLocaleString()}</td>
                </tr>

                {/* Expenses Section */}
                <tr className="bg-red-50/50 border-b border-red-100">
                  <td colSpan={14} className="p-3 font-black text-red-800 sticky right-0 bg-red-50/50 z-10 mt-8 block md:table-cell">הוצאות</td>
                </tr>
                {currentYearData.expenses.map(cat => (
                  <CategoryRow key={cat.id} category={cat} isExpense />
                ))}
                <tr className="bg-red-100 border-t-2 border-red-200 font-bold">
                  <td className="p-3 sticky right-0 bg-red-100 z-10 text-red-900">סה"כ הוצאות</td>
                  {expensesStats.monthlyTotals.map((val, idx) => (
                    <td key={idx} className="p-3 text-left font-mono text-red-900">{val.toLocaleString()}</td>
                  ))}
                  <td className="p-3 text-left font-mono text-red-900">{expensesStats.total.toLocaleString()}</td>
                </tr>

                {/* Net Balance Row */}
                <tr className="bg-purple-100 border-t-4 border-purple-300 font-black text-lg">
                  <td className="p-4 sticky right-0 bg-purple-100 z-10 text-purple-900">מאזן חודשי</td>
                  {monthlyBalance.map((val, idx) => (
                    <td key={idx} className={`p-4 text-left font-mono text-base ${val >= 0 ? 'text-purple-900' : 'text-red-700'}`}>
                      {val.toLocaleString()}
                    </td>
                  ))}
                  <td className={`p-4 text-left font-mono text-base ${netBalance >= 0 ? 'text-purple-900' : 'text-red-700'}`}>
                    {netBalance.toLocaleString()}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}
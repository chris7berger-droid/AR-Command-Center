import { useState } from "react";
import Topbar from "../components/Topbar";
import { getPageNumber, PageBadge, DirectoryOverlay } from "../components/Directory";
import Scorecards from "../components/Scorecards";
import AgingTable from "../components/AgingTable";
import DetailPanel from "../components/DetailPanel";
import InvoicesTab from "./InvoicesTab";
import CFFTab from "./CFFTab";
import HealthCheckTab from "./HealthCheckTab";
import ActionPlanTab from "./ActionPlanTab";
import TriageTab from "./TriageTab";
import { useAR } from "../lib/ARContext";
import { exportAgingView, exportInvoicesView, exportHealthView, exportActionView, exportCFFView } from "../lib/exportUtils";

export default function Dashboard() {
  const ar = useAR();
  const [activeTab, setActiveTab] = useState("triage");
  const [currentFilter, setCurrentFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("total");
  const [sortDir, setSortDir] = useState("desc");
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [showDirectory, setShowDirectory] = useState(false);

  const filtered = ar.getFiltered(currentFilter, searchTerm, sortBy, sortDir);

  const handleSort = (col) => {
    if (sortBy === col) setSortDir((d) => d === "desc" ? "asc" : "desc");
    else { setSortBy(col); setSortDir("desc"); }
  };

  const handleExport = () => {
    if (activeTab === "triage") return; // triage has no export
    else if (activeTab === "aging") exportAgingView(ar, currentFilter, searchTerm, sortBy, sortDir);
    else if (activeTab === "invoices") exportInvoicesView(ar.allInvoices);
    else if (activeTab === "cff") exportCFFView(ar);
    else if (activeTab === "health") exportHealthView(ar);
    else if (activeTab === "action") exportActionView(ar);
  };

  // Open detail panel from an invoice object (finds the customer first)
  const openDetailForInvoice = (inv) => {
    const cust = ar.customers.find((c) => c.name === inv.customer);
    if (cust) setSelectedCustomer(cust);
  };

  return (
    <div>
      <Topbar activeTab={activeTab} onTabChange={setActiveTab} onExport={handleExport} />
      <div style={{ maxWidth: 1260, margin: "0 auto", padding: "20px 16px", position: "relative", zIndex: 1 }}>
        {activeTab === "triage" && <TriageTab />}
        {activeTab === "aging" && (
          <>
            <Scorecards currentFilter={currentFilter} onFilterChange={setCurrentFilter} />
            <input type="text" placeholder="Search customers..." value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ width: "100%", maxWidth: 340, padding: "8px 14px", borderRadius: 8, border: "1px solid rgba(28,24,20,0.22)", background: "#a89b88", fontSize: 13, color: "#2d2720", marginBottom: 12 }} />
            <AgingTable filtered={filtered} sortBy={sortBy} sortDir={sortDir} onSort={handleSort} onSelectCustomer={setSelectedCustomer} />
          </>
        )}
        {activeTab === "invoices" && <InvoicesTab onSelectInvoice={openDetailForInvoice} />}
        {activeTab === "cff" && <CFFTab onSelectInvoice={openDetailForInvoice} />}
        {activeTab === "health" && <HealthCheckTab onSelectCustomer={setSelectedCustomer} />}
        {activeTab === "action" && <ActionPlanTab onSelectCustomer={setSelectedCustomer} onSelectInvoice={openDetailForInvoice} />}
      </div>

      {selectedCustomer && (
        <DetailPanel customer={selectedCustomer} onClose={() => setSelectedCustomer(null)} />
      )}

      <PageBadge pageNumber={getPageNumber(activeTab)} onClick={() => setShowDirectory(true)} />
      {showDirectory && (
        <DirectoryOverlay
          onClose={() => setShowDirectory(false)}
          currentPageId={getPageNumber(activeTab)}
          onNavigate={(tabId) => setActiveTab(tabId)}
        />
      )}
    </div>
  );
}

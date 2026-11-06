import fs from 'fs';
import path from 'path';

// 1. ManagerAccountsSection.jsx
const accPath = path.resolve('src/pages/manager/sections/ManagerAccountsSection.jsx');
let accContent = fs.readFileSync(accPath, 'utf8');
if (!accContent.includes("if (e.key === 'Escape'")) {
  const accHook = `  useEffect(() => {
    if (!detailId) return undefined;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => {
      if (e.key === 'Escape' && !pendingDecision) setDetailId(null);
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener('keydown', onKey);
    };
  }, [detailId, pendingDecision]);\n\n`;
  accContent = accContent.replace('const detail = useMemo(', accHook + '  const detail = useMemo(');
  fs.writeFileSync(accPath, accContent, 'utf8');
  console.log('Added Escape handler to ManagerAccountsSection.jsx');
}

// 2. ManagerCardsSection.jsx
const cardsPath = path.resolve('src/pages/manager/sections/ManagerCardsSection.jsx');
let cardsContent = fs.readFileSync(cardsPath, 'utf8');
if (!cardsContent.includes("if (e.key === 'Escape'")) {
  const cardsHook = `  useEffect(() => {
    if (!detailId) return undefined;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => {
      if (e.key === 'Escape' && !pendingAction) setDetailId(null);
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener('keydown', onKey);
    };
  }, [detailId, pendingAction]);\n\n`;
  cardsContent = cardsContent.replace('const detail = useMemo(', cardsHook + '  const detail = useMemo(');
  fs.writeFileSync(cardsPath, cardsContent, 'utf8');
  console.log('Added Escape handler to ManagerCardsSection.jsx');
}

// 3. ManagerLoansSection.jsx
const loansPath = path.resolve('src/pages/manager/sections/ManagerLoansSection.jsx');
let loansContent = fs.readFileSync(loansPath, 'utf8');
if (!loansContent.includes("if (e.key === 'Escape'")) {
  const loansHook = `  useEffect(() => {
    if (!detailId) return undefined;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => {
      if (e.key === 'Escape' && !pendingDecision && !disburseOpen) setDetailId(null);
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener('keydown', onKey);
    };
  }, [detailId, pendingDecision, disburseOpen]);\n\n`;
  loansContent = loansContent.replace('const detail = useMemo(', loansHook + '  const detail = useMemo(');
  fs.writeFileSync(loansPath, loansContent, 'utf8');
  console.log('Added Escape handler to ManagerLoansSection.jsx');
}

// 4. ManagerTicketsSection.jsx
const ticketsPath = path.resolve('src/pages/manager/sections/ManagerTicketsSection.jsx');
let ticketsContent = fs.readFileSync(ticketsPath, 'utf8');
if (!ticketsContent.includes("if (e.key === 'Escape'")) {
  const ticketsHook = `  useEffect(() => {
    if (!selectedId) return undefined;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => {
      if (e.key === 'Escape') setSelectedId(null);
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener('keydown', onKey);
    };
  }, [selectedId]);\n\n`;
  ticketsContent = ticketsContent.replace('const selected = useMemo(', ticketsHook + '  const selected = useMemo(');
  fs.writeFileSync(ticketsPath, ticketsContent, 'utf8');
  console.log('Added Escape handler to ManagerTicketsSection.jsx');
}

// 5. ManagerCustomersSection.jsx
const custPath = path.resolve('src/pages/manager/sections/ManagerCustomersSection.jsx');
let custContent = fs.readFileSync(custPath, 'utf8');
if (!custContent.includes("if (e.key === 'Escape'")) {
  const custHook = `  useEffect(() => {
    if (!selected) return undefined;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => {
      if (e.key === 'Escape') setSelected(null);
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener('keydown', onKey);
    };
  }, [selected]);\n\n`;
  custContent = custContent.replace('const filtered = useMemo(', custHook + '  const filtered = useMemo(');
  fs.writeFileSync(custPath, custContent, 'utf8');
  console.log('Added Escape handler to ManagerCustomersSection.jsx');
}

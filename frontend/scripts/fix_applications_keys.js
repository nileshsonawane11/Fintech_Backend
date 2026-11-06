import fs from 'fs';
import path from 'path';

const appSecPath = path.resolve('src/pages/portal/sections/ApplicationsSection.jsx');
let content = fs.readFileSync(appSecPath, 'utf8');

// Replace loans map
content = content.replace(
  '{loans.map((app) => (\n              <Card key={app.id} className="p-5">',
  '{loans.map((app, idx) => (\n              <Card key={app.id || app.loanApplicationId || app.applicationId || `loan-${idx}`} className="p-5">'
);
content = content.replace(
  '{loans.map((app) => (\r\n              <Card key={app.id} className="p-5">',
  '{loans.map((app, idx) => (\r\n              <Card key={app.id || app.loanApplicationId || app.applicationId || `loan-${idx}`} className="p-5">'
);

// Replace cards map
content = content.replace(
  '{cards.map((app) => (\n              <Card key={app.id} className="p-5">',
  '{cards.map((app, idx) => (\n              <Card key={app.id || app.cardApplicationId || app.applicationId || `card-${idx}`} className="p-5">'
);
content = content.replace(
  '{cards.map((app) => (\r\n              <Card key={app.id} className="p-5">',
  '{cards.map((app, idx) => (\r\n              <Card key={app.id || app.cardApplicationId || app.applicationId || `card-${idx}`} className="p-5">'
);

// Replace accounts map
content = content.replace(
  '{accounts.map((app) => (\n              <Card key={app.id} className="p-5">',
  '{accounts.map((app, idx) => (\n              <Card key={app.id || app.accountApplicationId || app.applicationId || `account-${idx}`} className="p-5">'
);
content = content.replace(
  '{accounts.map((app) => (\r\n              <Card key={app.id} className="p-5">',
  '{accounts.map((app, idx) => (\r\n              <Card key={app.id || app.accountApplicationId || app.applicationId || `account-${idx}`} className="p-5">'
);

// Replace investments map
content = content.replace(
  '{investments.map((app) => {',
  '{investments.map((app, idx) => {'
);
content = content.replace(
  '<Card key={app.id} className="p-5">',
  '<Card key={app.id || app.investmentApplicationId || app.applicationId || `investment-${idx}`} className="p-5">'
);

fs.writeFileSync(appSecPath, content, 'utf8');
console.log('Successfully fixed application list keys in ApplicationsSection.jsx');

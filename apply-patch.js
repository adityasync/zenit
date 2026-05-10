const fs = require('fs');
const path = 'E:\\adityap\\Zennit\\src\\app\\page.tsx';

let content = fs.readFileSync(path, 'utf8');

// Insertion 1: MarketOverview after Price Chart header
const insert1 = `\n             {/* Market Overview Widget */}
             <MarketOverview
               indices={indices}
               breadth={breadth}
               institutionalData={institutionalData}
             />\n`;

const pos1 = content.indexOf("            </div>\n            <select ");
if (pos1 !== -1) {
  // Insert after the first </div> (which is at pos1 + 20)
  content = content.slice(0, pos1 + 20) + insert1 + content.slice(pos1 + 20);
  console.log('Insertion 1 done at position', pos1);
} else {
  console.log('Insertion 1 failed - string not found');
}

// Insertion 2: ContextualDataPanel after Execution Engine
const insert2 = `\n\n                  {/* Contextual Data Panel */}
                  {selectedStock && (
                    <ContextualDataPanel
                      symbol={selectedStock.symbol}
                      sector={selectedStock.sector}
                      onClose={() => setSelectedStock(null)}
                    />
                  )}\n`;

// Find: </div>\n                 </div>\n               </div>\n             </motion.div>
// This is the closing of Execution Engine section
const searchStr2 = "                    </div>\n                 </div>\n               </div>\n             </motion.div>";
const pos2 = content.indexOf(searchStr2);
if (pos2 !== -1) {
  // Insert after the \n               </div>\n             </motion.div> part
  const insertPos = pos2 + searchStr2.indexOf("\n               </div>") + 23;
  content = content.slice(0, insertPos) + insert2 + content.slice(insertPos);
  console.log('Insertion 2 done at position', insertPos);
} else {
  console.log('Insertion 2 failed - string not found');
}

fs.writeFileSync(path, content, 'utf8');
console.log('File written successfully');

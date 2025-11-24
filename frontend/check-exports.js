import fs from 'fs';
import path from 'path';

const components = [
  'AudioControls.jsx',
  'EqualizerPanel.jsx',
  'FrequencyResponse.jsx', 
  'SignalViewer.jsx',
  'Spectrogram.jsx',
  'VerticalSlider.jsx'
];

console.log('🔍 Checking component exports...\n');

components.forEach(component => {
  const filePath = path.join('src/components', component);
  try {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      const hasDefaultExport = content.includes('export default');
      const exportLine = content.match(/export default\s+(\w+)/);
      
      if (hasDefaultExport && exportLine) {
        console.log(`✅ ${component} - exports "${exportLine[1]}"`);
      } else if (hasDefaultExport) {
        console.log(`✅ ${component} - has default export`);
      } else {
        console.log(`❌ ${component} - MISSING default export`);
      }
    } else {
      console.log(`❌ ${component} - FILE NOT FOUND`);
    }
  } catch (error) {
    console.log(`❌ ${component} - ERROR: ${error.message}`);
  }
});
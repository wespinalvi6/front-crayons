const fs = require('fs');

let content = fs.readFileSync('src/view/private/StudentPromotions.tsx', 'utf8');

// Replace axios import
content = content.replace('import axios from "axios";', 'import api from "@/lib/axios";');

// Remove BASE_URL
content = content.replace('const BASE_URL = "http://localhost:3000/api/promocion";\n', '');

// Replace all occurrences of axios with api and update paths
content = content.replace(/axios\.get\(`\$\{BASE_URL\}/g, 'api.get(`/promocion');
content = content.replace(/axios\.post\(`\$\{BASE_URL\}/g, 'api.post(`/promocion');
content = content.replace(/axios\.patch\(`\$\{BASE_URL\}/g, 'api.patch(`/promocion');
content = content.replace('axios.get("http://localhost:3000/api/grado/lista-grado")', 'api.get("/grado/lista-grado")');

// Replace handleBulkPromote logic to remove gradoId
content = content.replace(
`            // Llamada asumiendo el procesar masivo
            await api.post(\`/promocion/procesar-masivo\`, {
                periodIdActual: parseInt(selectedPeriod),
                periodIdSiguiente: parseInt(nextPeriod.id),
                gradoId: parseInt(selectedGradeId) // Asumimos que se puede enviar por grado para no hacer todo a la vez
            });`,
`            // Llamada asumiendo el procesar masivo
            await api.post(\`/promocion/procesar-masivo\`, {
                periodIdActual: parseInt(selectedPeriod),
                periodIdSiguiente: parseInt(nextPeriod.id)
            });`
);

// Rewrite handleSinglePromote
const singlePromoteOld = 
`    const handleSinglePromote = async (student: Student) => {
        // Lógica de promoción individual
        setSingleStudentAction(null);
        setIsProcessing(true);
        try {
            // Placeholder: llamada a API de promoción individual
            await new Promise(r => setTimeout(r, 800));
            setSuccessMessage(\`\${student.lastName} ha sido promovido exitosamente.\`);
            setTimeout(() => setSuccessMessage(null), 3000);
            setStudents(students.filter(s => s.id !== student.id));
        } catch (error) {
            setError("Error al promover al estudiante individualmente.");
        } finally {
            setIsProcessing(false);
        }
    };`;

const singlePromoteNew = 
`    const handleSinglePromote = async (student: Student) => {
        setSingleStudentAction(null);
        setIsProcessing(true);
        setError(null);
        try {
            const sortedPeriods = [...periods].sort((a, b) => parseInt(a.year) - parseInt(b.year));
            const currentIndex = sortedPeriods.findIndex((p) => p.id === selectedPeriod);
            const nextPeriod = sortedPeriods[currentIndex + 1];

            if (!nextPeriod) {
                throw new Error("No existe un año académico siguiente configurado para promover.");
            }

            await api.post(\`/promocion/promover-individual/\${student.id}\`, {
                periodIdSiguiente: parseInt(nextPeriod.id)
            });
            
            setSuccessMessage(\`\${student.lastName} ha sido procesado exitosamente.\`);
            setTimeout(() => setSuccessMessage(null), 3000);
            setStudents(students.filter(s => s.id !== student.id));
        } catch (err: any) {
            setError(err.response?.data?.message || err.message || "Error al procesar al estudiante individualmente.");
        } finally {
            setIsProcessing(false);
        }
    };`;

content = content.replace(singlePromoteOld, singlePromoteNew);


// Rewrite handleGraduateAll
const graduateAllOld =
`    const handleGraduateAll = async () => {
        // Lógica para egresar a todos los de 5to
        setGraduateOpen(false);
        setIsProcessing(true);
        try {
            // Placeholder: llamada a API para egresar y desactivar cuentas
            await new Promise(r => setTimeout(r, 1000));
            setSuccessMessage("Los alumnos han sido egresados. Sus accesos han sido desactivados para el próximo año.");
            setTimeout(() => setSuccessMessage(null), 4000);
            setStudents([]); // Vaciamos la lista porque ya no están en este grado
        } catch (error) {
            setError("Error al procesar el egreso de los alumnos.");
        } finally {
            setIsProcessing(false);
        }
    };`;

const graduateAllNew =
`    const handleGraduateAll = async () => {
        setGraduateOpen(false);
        setIsProcessing(true);
        setError(null);
        try {
            const sortedPeriods = [...periods].sort((a, b) => parseInt(a.year) - parseInt(b.year));
            const currentIndex = sortedPeriods.findIndex((p) => p.id === selectedPeriod);
            const nextPeriod = sortedPeriods[currentIndex + 1];

            if (!nextPeriod) {
                throw new Error("No existe un año académico siguiente configurado.");
            }

            await api.post('/promocion/procesar-masivo', {
                periodIdActual: parseInt(selectedPeriod),
                periodIdSiguiente: parseInt(nextPeriod.id)
            });

            setSuccessMessage("Los alumnos han sido egresados. Sus accesos han sido desactivados para el próximo año.");
            setTimeout(() => setSuccessMessage(null), 4000);
            
            // Refrescar
            const [periodsRes, gradesRes] = await Promise.all([
                 api.get('/promocion/periodos'),
                 api.get('/grado/lista-grado'),
             ]);
        } catch (err: any) {
            setError(err.response?.data?.message || err.message || "Error al procesar el egreso de los alumnos.");
        } finally {
            setIsProcessing(false);
        }
    };`;

content = content.replace(graduateAllOld, graduateAllNew);

fs.writeFileSync('src/view/private/StudentPromotions.tsx', content);
console.log('API endpoints updated in StudentPromotions.tsx');

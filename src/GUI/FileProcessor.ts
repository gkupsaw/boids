export class FileProcessor {
    static downloadTextAsJson(exportObj: {}, exportName: string) {
        const a = document.createElement('a');
        const jsonString = JSON.stringify(exportObj);
        const formattedJsonString = jsonString.replace(/\\"/g, '"');
        const dataURL = `data:application/json,${formattedJsonString}`;

        a.setAttribute('download', exportName + '.json');
        a.setAttribute('href', dataURL);

        a.click();
    }

    static async uploadJsonFile(): Promise<string> {
        return new Promise((resolve, reject) => {
            const input = document.createElement('input');
            input.setAttribute('id', 'file-input');
            input.setAttribute('type', 'file');
            input.onchange = () => {
                const selectedFile = input.files ? input.files[0] : null;

                if (selectedFile) {
                    const reader = new FileReader();
                    reader.readAsText(selectedFile, 'UTF-8');
                    reader.onload = function (evt) {
                        const rawData = evt.target?.result?.toString();

                        if (!rawData || rawData.length === 0) {
                            return reject('File was empty');
                        }

                        resolve(rawData);
                    };
                    reader.onerror = function (evt) {
                        reject('Error reading uploaded file');
                    };
                }
            };
            input.click();
            input.remove();
        });
    }
}

const cds = require('@sap/cds');
const dbClass = require("sap-hdbext-promisfied");
const hdbext = require("@sap/hdbext");
module.exports = async function(srv) {
	const db = await cds.connect.to("db");
    const {
        FileHeader,
        FileItems
    } = cds.entities("sap.poc.upload");
    srv.before('CREATE', `FileHeader`, (req, res)=>{
         if (req.data) {
         	var contentBase=req.data.Items[0].content.split(';base64')[0];
            var matchedValue= contentBase.match('spreadsheet|pdf|jpg|jpeg|png|excel')
            if (matchedValue === null){
            	return req.reject(401, "Files with extension other than pdf,jpg,jpeg,png,xls,xlsx cannot be uploaded");
            }
         }
    });
    srv.before('CREATE', `FileItems`, (req, res)=>{
         if (req.data) {
             
         }
    });
    srv.on('checkAttachment', async(req)=>{
		var data = req.data.listofClaim;
		var sp,output;
       	let dbConn = new dbClass(await dbClass.createConnection(db.options.credentials))
			sp = await dbConn.loadProcedurePromisified(hdbext, null, 'proc_validate_attach');
			output = await dbConn.callProcedurePromisified(sp, data);
		return output.results;
    });
    
}

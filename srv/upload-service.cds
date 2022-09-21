using { sap.poc.upload as up, sap.common } from '../db/upload-model';
@(impl:'./upload-service.js')
service uploadService @(path:'/browseUpload') {
@(requires:['system-user','authenticated-user'])
entity FileHeader as projection on up.FileHeader;
entity FileItems as projection on up.FileItems;
type attachmentListcheck{
	CLAIM_REFERENCE : String(50);
	CLAIM_CODE : String(50);
	COMPANY : String(50);
};
action checkAttachment(listofClaim: array of attachmentListcheck) returns array of attachmentListcheck;
}
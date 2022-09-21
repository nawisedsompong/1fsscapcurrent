using { cuid, managed, sap } from '@sap/cds/common';
namespace sap.poc.upload;

entity FileHeader : cuid, managed {
      fileID : String(50);
      appName : String(20);
   Items: Composition of many FileItems on Items.parent=$self;
}


entity FileItems: cuid, managed {
    fileID : String(50);
    itemsNo : String(5);
    fileName : String(111);
    createdName: String(255);
    @Core.IsMediaType : true
    mediaType : String; // @Core.IsMediaType;
    content : LargeBinary @Core.MediaType: mediaType @Core.ContentDisposition.Filename: fileName;
    parent: Association to FileHeader;
}


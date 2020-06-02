import {
  GeoPackage,
  GeoPackageAPI,
  FeatureColumn,
  GeometryColumns,
  DataTypes,
  BoundingBox,
} from '@ngageoint/geopackage';
import fs from 'fs';
import path from 'path';
import bbox from '@turf/bbox';
// import bbox from '@turf/bbox';

import xmlStream from 'xml-stream';

export interface KMLConverterOptions {
  append?: boolean;
  geoPackage?: GeoPackage | string;
  srsNumber?: number;
  tableName?: string;
  geoJson?: any;
}

export class KMLToGeoPackage {
  // KMLToGeoPackageEquiv = {
  //   Point: 'GEOMETRY',
  //   Polygon: 'GEOMETRY',
  //   LineString: 'GEOMETRY',
  //   name: 'TEXT',
  //   description: 'TEXT',

  // };
  boundingBox: BoundingBox;
  constructor(private options?: KMLToGeoPackage) {}

  async convertKMLToGeoPackage(
    kmlPath: string,
    // geopackage: GeoPackage,
    tableName: string,
  ): Promise<Set<string>> {
    const props = this.getAllPropertiesKML(kmlPath);
    return this.addToTable(kmlPath, await props, 'test');
    // return this.properties;
  }

  addToTable(kmlPath: string, properties: Set<string>, tableName: string): Promise<any>{
    return new Promise(resolve => {
      const geometryColumns = new GeometryColumns();
      geometryColumns.table_name = tableName;
      geometryColumns.column_name = 'geometry';
      geometryColumns.geometry_type_name = 'GEOMETRY';
      geometryColumns.z = 2;
      geometryColumns.m = 2;

      const columns = [];
      columns.push(FeatureColumn.createPrimaryKeyColumnWithIndexAndName(0, 'id'));
      columns.push(FeatureColumn.createGeometryColumn(1, 'geometry', 'GEOMETRY', false, null));
      let index = 2;

      for (const prop of properties) {
        columns.push(FeatureColumn.createColumn(index, prop, DataTypes.fromName('TEXT'), false, null));
        index++;
      }
      // for (const key in properties) {
      //   const prop = properties[key];
      //   if (prop.name.toLowerCase() !== 'id') {
      //     columns.push(FeatureColumn.createColumn(index, prop.name, DataTypes.fromName(prop.type), false, null));
      //     index++;
      //   } else {
      //     columns.push(
      //       FeatureColumn.createColumn(index, '_properties_' + prop.name, DataTypes.fromName(prop.type), false, null),
      //     );
      //     index++;
      //   }
      // }
      // console.log(columns);
      resolve('test');
      // const stream = fs.createReadStream(kmlPath);
      // const xml = new xmlStream(stream);
      // xml.on('endElement: Placemark', node => {
      //   console.log(node);
      // });
    });
  }

  getAllPropertiesKML(kmlPath: string): Promise<any> {
    return new Promise(resolve => {
      const properties = new Set();
      // Bounding box
      let minLat: number, minLon: number;
      let maxLat: number, maxLon: number;

      const stream = fs.createReadStream(kmlPath);
      const xml = new xmlStream(stream);

      xml.on('endElement: Placemark', (node: any) => {
        for (const property in node) {
          // Item to be treated like a Geometry
          if (
            property === 'Point' ||
            property === 'LineString' ||
            property === 'LineRing' ||
            property === 'Polygon' ||
            property === 'MultiGeomtry'
          ) {
          } else {
            properties.add(property);
          }
        }
      });
      xml.on('endElement: Placemark coordinates', (node: { $text: string }) => {
        const rows = node.$text.split(/\s/);
        rows.forEach((element: string) => {
          const temp = element.split(',');
          if (minLat === undefined) minLat = Number(temp[0]);
          if (minLon === undefined) minLon = Number(temp[1]);
          if (maxLat === undefined) maxLat = Number(temp[0]);
          if (maxLon === undefined) maxLon = Number(temp[1]);

          if (Number(temp[0]) < minLat) minLat = Number(temp[0]);
          if (Number(temp[0]) > maxLat) maxLat = Number(temp[0]);
          if (Number(temp[1]) < minLon) minLon = Number(temp[1]);
          if (Number(temp[1]) > maxLon) maxLon = Number(temp[1]);
        });
      });
      xml.on('end', () => {
        this.boundingBox = new BoundingBox(minLat, maxLat, minLon, maxLon);
        resolve(properties);
      });
    });
  }
}
// const test = new KMLToGeoPackage();
// test.convertKMLToGeoPackage('', '');

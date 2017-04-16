/*
 * Squidex Headless CMS
 *
 * @license
 * Copyright (c) Sebastian Stehle. All rights reserved
 */

import { Injectable } from '@angular/core';
import { Headers } from '@angular/http';
import { Observable } from 'rxjs';
import { ProgressHttp } from 'angular-progress-http';

import {
    ApiUrlConfig,
    DateTime,
    Version
} from 'framework';

import { AuthService } from './auth.service';

export class AssetsDto {
    constructor(
        public readonly total: number,
        public readonly items: AssetDto[]
    ) {
    }
}

export class AssetDto {
    constructor(
        public readonly id: string,
        public readonly createdBy: string,
        public readonly lastModifiedBy: string,
        public readonly created: DateTime,
        public readonly lastModified: DateTime,
        public readonly fileName: string,
        public readonly fileSize: number,
        public readonly mimeType: string,
        public readonly isImage: boolean,
        public readonly pixelWidth: number | null,
        public readonly pixelHeight: number | null,
        public readonly version: Version
    ) {
    }
}

export class AssetCreatedDto {
    constructor(
        public readonly id: string,
        public readonly fileName: string,
        public readonly fileSize: number,
        public readonly mimeType: string,
        public readonly isImage: boolean,
        public readonly pixelWidth: number | null,
        public readonly pixelHeight: number | null,
        public readonly version: Version
    ) {
    }
}

export class AssetReplacedDto {
    constructor(
        public readonly fileSize: number,
        public readonly mimeType: string,
        public readonly isImage: boolean,
        public readonly pixelWidth: number | null,
        public readonly pixelHeight: number | null,
        public readonly version: Version
    ) {
    }
}

@Injectable()
export class AssetsService {
    constructor(
        private readonly http: ProgressHttp,
        private readonly apiUrl: ApiUrlConfig,
        private readonly authService: AuthService
    ) {
    }

    public getAssets(appName: string, take: number, skip: number, query: string, mimeTypes: string[]): Observable<AssetsDto> {
        let fullQuery = query ? query.trim() : '';

        if (mimeTypes && mimeTypes.length > 0) {
            let mimeQuery = '&mimeTypes=';

            for (let i = 0; i < mimeTypes.length; i++) {
                mimeQuery += mimeTypes[0];

                if (i > 0) {
                    mimeQuery += ',';
                }
            }

            fullQuery += mimeQuery;
        }

        if (query && query.length > 0) {
            fullQuery += `&query=${query}`;
        }

        if (take > 0) {
            fullQuery += `&take=${take}`;
        }

        if (skip > 0) {
            fullQuery += `&skip=${skip}`;
        }

        const url = this.apiUrl.buildUrl(`api/apps/${appName}/assets/?${fullQuery}`);

        return this.authService.authGet(url)
                .map(response => response.json())
                .map(response => {
                    const items: any[] = response.items;

                    return new AssetsDto(response.total, items.map(item => {
                        return new AssetDto(
                            item.id,
                            item.createdBy,
                            item.lastModifiedBy,
                            DateTime.parseISO_UTC(item.created),
                            DateTime.parseISO_UTC(item.lastModified),
                            item.fileName,
                            item.fileSize,
                            item.mimeType,
                            item.isImage,
                            item.pixelWidth,
                            item.pixelHeight,
                            new Version(item.version.toString()));
                    }));
                })
                .catchError('Failed to load assets. Please reload.');
    }

    public uploadFile(appName: string, file: File): Observable<number | AssetCreatedDto> {
        return new Observable<number | AssetCreatedDto>(subscriber => {
            const url = this.apiUrl.buildUrl(`api/apps/${appName}/assets/`);

            const content = new FormData();
            const headers = new Headers({
                'Authorization': `${this.authService.user.user.token_type} ${this.authService.user.user.access_token}`
            });

            content.append('file', file);

            this.http.withUploadProgressListener(progress => subscriber.next(progress.percentage))
                .post(url, content, { headers })
                .map(response => response.json())
                .map(response => {
                    return new AssetCreatedDto(
                        response.id,
                        response.fileName,
                        response.fileSize,
                        response.mimeType,
                        response.isImage,
                        response.pixelWidth,
                        response.pixelHeight,
                        new Version(response.version.toString()));
                })
                .catchError('Failed to upload asset. Please reload.')
                .subscribe(value => {
                    subscriber.next(value);
                }, err => {
                    subscriber.error(err);
                }, () => {
                    subscriber.complete();
                });
        });
    }

    public replaceFile(appName: string, id: string, file: File, version?: Version): Observable<number | AssetReplacedDto> {
        return new Observable<number | AssetReplacedDto>(subscriber => {
            const url = this.apiUrl.buildUrl(`api/apps/${appName}/assets/${id}/content`);

            const content = new FormData();
            const headers = new Headers({
                'Authorization': `${this.authService.user.user.token_type} ${this.authService.user.user.access_token}`
            });

            if (version && version.value.length > 0) {
                headers.append('If-Match', version.value);
            }

            content.append('file', file);

            this.http.withUploadProgressListener(progress => subscriber.next(progress.percentage))
                .put(url, content, { headers })
                .map(response => response.json())
                .map(response => {
                    return new AssetReplacedDto(
                        response.fileSize,
                        response.mimeType,
                        response.isImage,
                        response.pixelWidth,
                        response.pixelHeight,
                        new Version(response.version.toString()));
                })
                .catchError('Failed to replace asset. Please reload.')
                .subscribe(value => {
                    subscriber.next(value);
                }, err => {
                    subscriber.error(err);
                }, () => {
                    subscriber.complete();
                });
        });
    }

    public deleteAsset(appName: string, id: string, version: Version): Observable<any> {
        const url = this.apiUrl.buildUrl(`api/apps/${appName}/assets/${id}`);

        return this.authService.authDelete(url, version)
                .catchError('Failed to delete asset. Please reload.');
    }
}
﻿// ==========================================================================
//  IModelSchemaRepository.cs
//  PinkParrot Headless CMS
// ==========================================================================
//  Copyright (c) PinkParrot Group
//  All rights reserved.
// ==========================================================================

using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using PinkParrot.Read.Models;

namespace PinkParrot.Read.Repositories
{
    public interface IModelSchemaRepository
    {
        Task<List<ModelSchemaListRM>> QueryAllAsync(Guid tenantId);
    }
}
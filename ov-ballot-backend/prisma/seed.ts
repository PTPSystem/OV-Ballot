import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Seed event types - organized by category with sort order
  const eventTypes = [
    // Platform Speeches (alphabetical: Digital Presentation, Informative, Persuasive)
    {
      name: 'digital_presentation',
      displayName: 'Digital Presentation',
      rubricConfig: {
        categories: ['content', 'organization_citations', 'vocal_delivery', 'physical_delivery', 'impact'],
        type: 'platform',
        group: 'Platform',
        sortOrder: 1,
        categoryLabels: {
          category_3: 'Vocal Delivery',
          category_4: 'Physical Delivery'
        }
      }
    },
    {
      name: 'informative',
      displayName: 'Informative',
      rubricConfig: {
        categories: ['content', 'organization_citations', 'vocal_delivery', 'physical_delivery', 'impact'],
        type: 'platform',
        group: 'Platform',
        sortOrder: 2,
        categoryLabels: {
          category_3: 'Vocal Delivery',
          category_4: 'Physical Delivery'
        }
      }
    },
    {
      name: 'persuasive',
      displayName: 'Persuasive',
      rubricConfig: {
        categories: ['content', 'organization_citations', 'vocal_delivery', 'physical_delivery', 'impact'],
        type: 'platform',
        group: 'Platform',
        sortOrder: 3,
        categoryLabels: {
          category_3: 'Vocal Delivery',
          category_4: 'Physical Delivery'
        }
      }
    },
    // Limited Prep (alphabetical: Apologetics, Extemporaneous, Impromptu)
    {
      name: 'apologetics',
      displayName: 'Apologetics',
      rubricConfig: {
        categories: ['content', 'organization_citations', 'vocal_delivery', 'physical_delivery', 'impact'],
        type: 'platform',
        group: 'Limited Prep',
        sortOrder: 4,
        categoryLabels: {
          category_3: 'Vocal Delivery',
          category_4: 'Physical Delivery'
        }
      }
    },
    {
      name: 'extemporaneous',
      displayName: 'Extemporaneous',
      rubricConfig: {
        categories: ['content', 'organization_citations', 'vocal_delivery', 'physical_delivery', 'impact'],
        type: 'platform',
        group: 'Limited Prep',
        sortOrder: 5,
        categoryLabels: {
          category_3: 'Vocal Delivery',
          category_4: 'Physical Delivery'
        }
      }
    },
    {
      name: 'impromptu',
      displayName: 'Impromptu',
      rubricConfig: {
        categories: ['content', 'organization_citations', 'vocal_delivery', 'physical_delivery', 'impact'],
        type: 'platform',
        group: 'Limited Prep',
        sortOrder: 6,
        categoryLabels: {
          category_3: 'Vocal Delivery',
          category_4: 'Physical Delivery'
        }
      }
    },
    // Interpretation Events (alphabetical: Biblical Presentation, Duo Interpretation, Open Interpretation, Oratorical)
    {
      name: 'biblical_presentation',
      displayName: 'Biblical Presentation',
      rubricConfig: {
        categories: ['content', 'organization_citations', 'characterization', 'blocking', 'impact'],
        type: 'interpretation',
        group: 'Interpretation',
        sortOrder: 7,
        categoryLabels: {
          category_3: 'Characterization',
          category_4: 'Blocking'
        }
      }
    },
    {
      name: 'duo_interpretation',
      displayName: 'Duo Interpretation',
      rubricConfig: {
        categories: ['content', 'organization_citations', 'characterization', 'blocking', 'impact'],
        type: 'interpretation',
        group: 'Interpretation',
        sortOrder: 8,
        categoryLabels: {
          category_3: 'Characterization',
          category_4: 'Blocking'
        }
      }
    },
    {
      name: 'open_interpretation',
      displayName: 'Open Interpretation',
      rubricConfig: {
        categories: ['content', 'organization_citations', 'characterization', 'blocking', 'impact'],
        type: 'interpretation',
        group: 'Interpretation',
        sortOrder: 9,
        categoryLabels: {
          category_3: 'Characterization',
          category_4: 'Blocking'
        }
      }
    },
    {
      name: 'oratorical',
      displayName: 'Oratorical',
      rubricConfig: {
        categories: ['content', 'organization_citations', 'characterization', 'blocking', 'impact'],
        type: 'interpretation',
        group: 'Interpretation',
        sortOrder: 10,
        categoryLabels: {
          category_3: 'Characterization',
          category_4: 'Blocking'
        }
      }
    }
  ];

  for (const eventType of eventTypes) {
    await prisma.eventType.upsert({
      where: { name: eventType.name },
      update: {
        displayName: eventType.displayName,
        rubricConfig: eventType.rubricConfig
      },
      create: eventType
    });
    console.log(`✅ Seeded event type: ${eventType.displayName}`);
  }

  console.log('🎉 Seeding complete!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

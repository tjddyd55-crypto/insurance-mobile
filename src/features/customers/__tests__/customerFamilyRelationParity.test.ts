import { listCustomerAppCompactActions } from '../customerAppActions';
import {
  familyMemberIdsEqual,
  listIndividualRelationsExclusiveOfFamily,
  selectFamilyGroups,
} from '../customerRelationPresentation';
import { CUSTOMER_FORM_VISIBLE_FIELDS } from '../customerFormVisibleFields';

describe('customer form birthDate input', () => {
  it('does not include birthDate in visible form fields', () => {
    expect(CUSTOMER_FORM_VISIBLE_FIELDS).not.toContain('birthDate');
    expect(CUSTOMER_FORM_VISIBLE_FIELDS).not.toContain('생년월일');
  });
});

describe('customer app compact actions', () => {
  it('exposes exactly two workspace actions', () => {
    expect(listCustomerAppCompactActions()).toEqual(['링크 복사', '알림톡']);
    expect(listCustomerAppCompactActions()).toHaveLength(2);
  });
});

describe('customer relation presentation', () => {
  it('keeps family groups shared across members', () => {
    const groupA = {
      id: 1,
      name: '가족',
      groupType: 'FAMILY',
      memo: '',
      members: [
        {
          customerId: 1,
          name: 'A',
          phone: '',
          relationshipLabel: '본인',
          isCurrentCustomer: true,
        },
        {
          customerId: 2,
          name: 'B',
          phone: '',
          relationshipLabel: '배우자',
          isCurrentCustomer: false,
        },
        {
          customerId: 3,
          name: 'C',
          phone: '',
          relationshipLabel: '자녀',
          isCurrentCustomer: false,
        },
      ],
    };
    const groupB = {
      ...groupA,
      members: groupA.members.map((member) => ({
        ...member,
        isCurrentCustomer: member.customerId === 2,
      })),
    };
    expect(familyMemberIdsEqual(groupA, groupB)).toBe(true);
    expect(selectFamilyGroups([groupA, { ...groupA, id: 9, groupType: 'BUSINESS' }])).toHaveLength(
      1,
    );
  });

  it('isolates individual relations from family membership for exclusive listing', () => {
    const family = selectFamilyGroups([
      {
        id: 1,
        name: '가족',
        groupType: 'FAMILY',
        memo: '',
        members: [
          {
            customerId: 1,
            name: 'A',
            phone: '',
            relationshipLabel: '본인',
            isCurrentCustomer: true,
          },
          {
            customerId: 2,
            name: 'B',
            phone: '',
            relationshipLabel: '배우자',
            isCurrentCustomer: false,
          },
        ],
      },
    ]);
    const relations = [
      {
        relatedCustomerId: 2,
        relatedName: 'B',
        relatedPhone: '',
        createdAt: '',
      },
      {
        relatedCustomerId: 9,
        relatedName: 'D',
        relatedPhone: '',
        createdAt: '',
      },
    ];
    expect(listIndividualRelationsExclusiveOfFamily(relations, family)).toEqual([
      relations[1],
    ]);
  });
});
